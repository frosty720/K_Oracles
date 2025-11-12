const { ethers } = require('ethers');
const cron = require('node-cron');
const winston = require('winston');

// API Sources
const BinanceAPI = require('../api/BinanceAPI');
const GeckoTerminalAPI = require('../api/GeckoTerminalAPI');
const CoinbaseAPI = require('../api/CoinbaseAPI');
const KucoinAPI = require('../api/KucoinAPI');
const CryptoCompareAPI = require('../api/CryptoCompareAPI');
const KrakenAPI = require('../api/KrakenAPI');
const OKXAPI = require('../api/OKXAPI');

// Contract ABI (simplified)
const ORACLE_ABI = [
    "function updatePrice(uint256 newPrice, uint256[] calldata sourcePrices, bytes32[] calldata sources) external",
    "function getPriceData() external view returns (uint256 price, uint256 timestamp, bool valid)",
    "function peek() external view returns (bytes32, bool)",
    "event PriceUpdate(uint256 indexed price, uint256 timestamp, address updater)"
];

/**
 * KUSD Oracle Node
 * Fetches prices from multiple sources and submits to oracle contracts
 */
class OracleNode {
    constructor(config) {
        this.config = config;
        this.nodeId = config.nodeId || 'node_1';
        this.updateInterval = config.updateInterval || 60000; // 1 minute
        this.maxDeviation = config.maxDeviation || 1000; // 10%
        
        // Setup logger
        this.logger = winston.createLogger({
            level: config.logLevel || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} [${this.nodeId}] ${level}: ${message}`;
                })
            ),
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: `logs/${this.nodeId}.log` })
            ]
        });

        // Setup blockchain connection
        this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        
        // Oracle contracts
        this.oracles = {};
        for (const [asset, address] of Object.entries(config.oracleAddresses)) {
            this.oracles[asset] = new ethers.Contract(address, ORACLE_ABI, this.wallet);
        }

        // Price sources
        this.sources = {
            binance: new BinanceAPI(config.apis?.binance || {}),
            geckoterminal: new GeckoTerminalAPI(config.apis?.geckoterminal || {}),
            coinbase: new CoinbaseAPI(config.apis?.coinbase || {}),
            kucoin: new KucoinAPI(config.apis?.kucoin || {}),
            cryptocompare: new CryptoCompareAPI(config.apis?.cryptocompare || {}),
            kraken: new KrakenAPI(config.apis?.kraken || {}),
            okx: new OKXAPI(config.apis?.okx || {})
        };

        // Supported assets
        this.assets = config.assets || ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'];
        
        // State
        this.isRunning = false;
        this.lastPrices = {};
        this.failureCount = {};
    }

    /**
     * Start the oracle node
     */
    async start() {
        this.logger.info('Starting KUSD Oracle Node...');
        this.isRunning = true;

        // Initial price update
        await this.updateAllPrices();

        // Schedule regular updates
        this.scheduleUpdates();

        // Setup health monitoring
        this.setupHealthMonitoring();

        this.logger.info('Oracle node started successfully');
    }

    /**
     * Stop the oracle node
     */
    async stop() {
        this.logger.info('Stopping oracle node...');
        this.isRunning = false;
    }

    /**
     * Schedule price updates
     */
    scheduleUpdates() {
        // Update every minute
        cron.schedule('* * * * *', async () => {
            if (this.isRunning) {
                await this.updateAllPrices();
            }
        });

        // Health check every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            if (this.isRunning) {
                await this.healthCheck();
            }
        });
    }

    /**
     * Update prices for all assets
     */
    async updateAllPrices() {
        this.logger.info('Updating all asset prices...');

        for (const asset of this.assets) {
            try {
                await this.updateAssetPrice(asset);
                this.failureCount[asset] = 0;
            } catch (error) {
                this.failureCount[asset] = (this.failureCount[asset] || 0) + 1;
                this.logger.error(`Failed to update ${asset}: ${error.message}`);
                
                // Alert if too many failures
                if (this.failureCount[asset] >= 5) {
                    await this.sendAlert(`${asset} price updates failing repeatedly`);
                }
            }
        }
    }

    /**
     * Update price for a specific asset
     */
    async updateAssetPrice(asset) {
        if (!this.oracles[asset]) {
            throw new Error(`No oracle contract for ${asset}`);
        }

        // Fetch prices from all sources
        const sourcePrices = await this.fetchPricesFromAllSources(asset);
        
        if (sourcePrices.length < 3) {
            throw new Error(`Insufficient price sources for ${asset}: ${sourcePrices.length}`);
        }

        // Calculate median price
        const medianPrice = this.calculateMedian(sourcePrices.map(p => p.price));
        
        // Validate price
        this.validatePrice(asset, medianPrice, sourcePrices.map(p => p.price));

        // Convert to wei (18 decimals)
        const priceWei = ethers.parseEther(medianPrice.toString());
        const sourcePricesWei = sourcePrices.map(p => ethers.parseEther(p.price.toString()));
        const sourceNames = sourcePrices.map(p => ethers.encodeBytes32String(p.source));

        // Submit to oracle contract
        const tx = await this.oracles[asset].updatePrice(
            priceWei,
            sourcePricesWei,
            sourceNames,
            {
                gasLimit: 200000,
                gasPrice: ethers.parseUnits('20', 'gwei')
            }
        );

        await tx.wait();
        
        this.lastPrices[asset] = {
            price: medianPrice,
            timestamp: Date.now(),
            sources: sourcePrices.length,
            txHash: tx.hash
        };

        this.logger.info(`Updated ${asset}: $${medianPrice.toFixed(2)} (${sourcePrices.length} sources) - TX: ${tx.hash}`);
    }

    /**
     * Fetch prices from all available sources
     */
    async fetchPricesFromAllSources(asset) {
        // Define which sources to skip for specific assets
        const skipSources = {
            'DAI': ['binance', 'kucoin']  // DAI is delisted/unavailable on these exchanges
        };

        const promises = Object.entries(this.sources).map(async ([sourceName, source]) => {
            // Skip sources that don't support this asset
            if (skipSources[asset]?.includes(sourceName)) {
                return null;
            }

            try {
                const price = await source.getPrice(asset);
                return { source: sourceName, price, timestamp: Date.now() };
            } catch (error) {
                this.logger.warn(`${sourceName} failed for ${asset}: ${error.message}`);
                return null;
            }
        });

        const results = await Promise.allSettled(promises);
        return results
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);
    }

    /**
     * Calculate median of an array
     */
    calculateMedian(prices) {
        const sorted = [...prices].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    /**
     * Validate price against sources
     */
    validatePrice(asset, newPrice, sourcePrices) {
        // Check if price is reasonable
        if (newPrice <= 0) {
            throw new Error(`Invalid price for ${asset}: ${newPrice}`);
        }

        // Check deviation from median
        const median = this.calculateMedian(sourcePrices);
        const deviation = Math.abs(newPrice - median) / median * 10000; // basis points
        
        if (deviation > this.maxDeviation) {
            throw new Error(`Price deviation too high for ${asset}: ${deviation}bp`);
        }

        // Check against last known price (if exists)
        const lastPrice = this.lastPrices[asset];
        if (lastPrice) {
            const timeDiff = Date.now() - lastPrice.timestamp;
            const priceDiff = Math.abs(newPrice - lastPrice.price) / lastPrice.price * 100;
            
            // Alert on large price movements
            if (priceDiff > 10 && timeDiff < 300000) { // 10% in 5 minutes
                this.logger.warn(`Large price movement for ${asset}: ${priceDiff.toFixed(2)}%`);
            }
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        this.logger.info('Performing health check...');
        
        const issues = [];
        
        // Check blockchain connection
        try {
            await this.provider.getBlockNumber();
        } catch (error) {
            issues.push('Blockchain connection failed');
        }

        // Check oracle contracts
        for (const [asset, oracle] of Object.entries(this.oracles)) {
            try {
                await oracle.getPriceData();
            } catch (error) {
                issues.push(`Oracle contract for ${asset} not responding`);
            }
        }

        // Check price sources
        for (const [sourceName, source] of Object.entries(this.sources)) {
            try {
                await source.getPrice('BTC');
            } catch (error) {
                issues.push(`Price source ${sourceName} not responding`);
            }
        }

        if (issues.length > 0) {
            this.logger.error(`Health check failed: ${issues.join(', ')}`);
            await this.sendAlert(`Health check issues: ${issues.join(', ')}`);
        } else {
            this.logger.info('Health check passed');
        }
    }

    /**
     * Setup health monitoring
     */
    setupHealthMonitoring() {
        // Monitor for unhandled errors
        process.on('uncaughtException', (error) => {
            this.logger.error(`Uncaught exception: ${error.message}`);
            this.sendAlert(`Oracle node crashed: ${error.message}`);
        });

        process.on('unhandledRejection', (reason) => {
            this.logger.error(`Unhandled rejection: ${reason}`);
        });
    }

    /**
     * Send alert (placeholder - implement with Discord/Slack/Email)
     */
    async sendAlert(message) {
        this.logger.error(`ALERT: ${message}`);
        // TODO: Implement Discord/Slack/Email notifications
    }

    /**
     * Get node status
     */
    getStatus() {
        return {
            nodeId: this.nodeId,
            isRunning: this.isRunning,
            lastPrices: this.lastPrices,
            failureCount: this.failureCount,
            uptime: process.uptime()
        };
    }
}

module.exports = OracleNode;
