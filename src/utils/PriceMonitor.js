const BinanceAPI = require('../api/BinanceAPI');
const CoinGeckoAPI = require('../api/CoinGeckoAPI');
const CoinbaseAPI = require('../api/CoinbaseAPI');
const KucoinAPI = require('../api/KucoinAPI');
const CryptoCompareAPI = require('../api/CryptoCompareAPI');

/**
 * Price monitoring utility for testing oracle sources
 */
class PriceMonitor {
    constructor() {
        this.sources = {
            binance: new BinanceAPI(),
            coingecko: new CoinGeckoAPI(),
            coinbase: new CoinbaseAPI(),
            kucoin: new KucoinAPI(),
            cryptocompare: new CryptoCompareAPI()
        };
        
        this.assets = ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'];
    }

    /**
     * Test all price sources for a specific asset
     */
    async testAssetPrices(asset) {
        console.log(`\n🔍 Testing price sources for ${asset}:`);
        console.log('=' * 50);
        
        const results = {};
        const promises = Object.entries(this.sources).map(async ([sourceName, source]) => {
            try {
                const startTime = Date.now();
                const price = await source.getPrice(asset);
                const responseTime = Date.now() - startTime;
                
                results[sourceName] = {
                    price,
                    responseTime,
                    status: 'success'
                };
                
                console.log(`✅ ${sourceName.padEnd(15)}: $${price.toFixed(2).padStart(10)} (${responseTime}ms)`);
            } catch (error) {
                results[sourceName] = {
                    price: null,
                    responseTime: null,
                    status: 'error',
                    error: error.message
                };
                
                console.log(`❌ ${sourceName.padEnd(15)}: ERROR - ${error.message}`);
            }
        });

        await Promise.allSettled(promises);
        
        // Calculate statistics
        const successfulPrices = Object.values(results)
            .filter(r => r.status === 'success')
            .map(r => r.price);
            
        if (successfulPrices.length > 0) {
            const sortedPrices = [...successfulPrices].sort((a, b) => a - b);
            const median = this.calculateMedian(sortedPrices);
            const min = Math.min(...successfulPrices);
            const max = Math.max(...successfulPrices);
            const spread = ((max - min) / median * 100).toFixed(2);
            
            console.log(`\n📊 Statistics:`);
            console.log(`   Median: $${median.toFixed(2)}`);
            console.log(`   Range:  $${min.toFixed(2)} - $${max.toFixed(2)}`);
            console.log(`   Spread: ${spread}%`);
            console.log(`   Sources: ${successfulPrices.length}/${Object.keys(this.sources).length}`);
        }
        
        return results;
    }

    /**
     * Test all assets across all sources
     */
    async testAllAssets() {
        console.log('🚀 KUSD Oracle Price Source Testing');
        console.log('=====================================');
        
        const allResults = {};
        
        for (const asset of this.assets) {
            allResults[asset] = await this.testAssetPrices(asset);
            await this.sleep(1000); // Rate limiting
        }
        
        // Summary
        console.log('\n📋 Summary Report:');
        console.log('==================');
        
        for (const [asset, results] of Object.entries(allResults)) {
            const successCount = Object.values(results).filter(r => r.status === 'success').length;
            const totalCount = Object.keys(results).length;
            const successRate = (successCount / totalCount * 100).toFixed(1);
            
            console.log(`${asset}: ${successCount}/${totalCount} sources (${successRate}%)`);
        }
        
        return allResults;
    }

    /**
     * Monitor prices in real-time
     */
    async startMonitoring(asset = 'BTC', interval = 30000) {
        console.log(`🔄 Starting real-time monitoring for ${asset} (${interval/1000}s intervals)`);
        console.log('Press Ctrl+C to stop\n');
        
        const monitor = async () => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] Fetching ${asset} prices...`);
            
            await this.testAssetPrices(asset);
        };
        
        // Initial fetch
        await monitor();
        
        // Set up interval
        const intervalId = setInterval(monitor, interval);
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping price monitoring...');
            clearInterval(intervalId);
            process.exit(0);
        });
    }

    /**
     * Test oracle validation logic
     */
    async testValidation(asset = 'BTC') {
        console.log(`\n🧪 Testing validation logic for ${asset}:`);
        
        const results = await this.testAssetPrices(asset);
        const successfulPrices = Object.values(results)
            .filter(r => r.status === 'success')
            .map(r => r.price);
            
        if (successfulPrices.length < 3) {
            console.log('❌ Insufficient sources for validation (need at least 3)');
            return false;
        }
        
        const median = this.calculateMedian(successfulPrices);
        const maxDeviation = 0.10; // 10%
        
        console.log(`\nValidation Results:`);
        console.log(`Median price: $${median.toFixed(2)}`);
        
        let validPrices = 0;
        for (const price of successfulPrices) {
            const deviation = Math.abs(price - median) / median;
            const isValid = deviation <= maxDeviation;
            
            console.log(`  $${price.toFixed(2)} - ${(deviation * 100).toFixed(2)}% deviation - ${isValid ? '✅ Valid' : '❌ Invalid'}`);
            
            if (isValid) validPrices++;
        }
        
        const validationRate = (validPrices / successfulPrices.length * 100).toFixed(1);
        console.log(`\nValidation rate: ${validPrices}/${successfulPrices.length} (${validationRate}%)`);
        
        return validPrices >= 3;
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
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = PriceMonitor;

// CLI usage
if (require.main === module) {
    const monitor = new PriceMonitor();
    
    const command = process.argv[2];
    const asset = process.argv[3] || 'BTC';
    
    switch (command) {
        case 'test':
            monitor.testAssetPrices(asset);
            break;
        case 'all':
            monitor.testAllAssets();
            break;
        case 'monitor':
            monitor.startMonitoring(asset);
            break;
        case 'validate':
            monitor.testValidation(asset);
            break;
        default:
            console.log('Usage:');
            console.log('  node src/utils/PriceMonitor.js test [asset]     - Test single asset');
            console.log('  node src/utils/PriceMonitor.js all              - Test all assets');
            console.log('  node src/utils/PriceMonitor.js monitor [asset]  - Real-time monitoring');
            console.log('  node src/utils/PriceMonitor.js validate [asset] - Test validation logic');
    }
}
