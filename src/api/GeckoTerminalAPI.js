const axios = require('axios');
const PriceSource = require('./PriceSource');

/**
 * GeckoTerminal API price source
 * Fetches DEX prices from GeckoTerminal (free, no API key required)
 */
class GeckoTerminalAPI extends PriceSource {
    constructor(config = {}) {
        super('GeckoTerminal', config);
        this.baseURL = 'https://api.geckoterminal.com/api/v2';
        
        // Token contract addresses on Ethereum mainnet
        // GeckoTerminal uses contract addresses to identify tokens
        this.tokenAddresses = {
            'BTC': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',  // WBTC on Ethereum
            'ETH': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',  // WETH on Ethereum
            'USDT': '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT on Ethereum
            'USDC': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum
            'DAI': '0x6b175474e89094c44da98b954eedeac495271d0f'   // DAI on Ethereum
        };
        
        // Network identifier (Ethereum mainnet)
        this.network = 'eth';
    }

    async getPrice(symbol) {
        const tokenAddress = this.tokenAddresses[symbol];
        if (!tokenAddress) {
            throw new Error(`Symbol ${symbol} not supported by GeckoTerminal`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(
                `${this.baseURL}/simple/networks/${this.network}/token_price/${tokenAddress}`,
                {
                    timeout: this.timeout,
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            const data = response.data?.data?.attributes?.token_prices;
            if (!data || !data[tokenAddress]) {
                throw new Error(`No price data for ${symbol}`);
            }

            const price = parseFloat(data[tokenAddress]);
            return this.validatePrice(price);
        });
    }

    /**
     * Get multiple prices at once (more efficient)
     */
    async getPrices(symbols) {
        const addresses = symbols
            .map(symbol => this.tokenAddresses[symbol])
            .filter(addr => addr);

        if (addresses.length === 0) {
            return {};
        }

        return this.withRetry(async () => {
            const addressList = addresses.join(',');
            const response = await axios.get(
                `${this.baseURL}/simple/networks/${this.network}/token_price/${addressList}`,
                {
                    timeout: this.timeout,
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            const data = response.data?.data?.attributes?.token_prices;
            if (!data) {
                throw new Error('No price data returned');
            }

            // Map addresses back to symbols
            const prices = {};
            for (const [symbol, address] of Object.entries(this.tokenAddresses)) {
                if (data[address]) {
                    prices[symbol] = parseFloat(data[address]);
                }
            }

            return prices;
        });
    }

    /**
     * Get detailed pool information for a token
     * This can be used for additional validation or monitoring
     */
    async getTopPools(symbol, limit = 5) {
        const tokenAddress = this.tokenAddresses[symbol];
        if (!tokenAddress) {
            throw new Error(`Symbol ${symbol} not supported by GeckoTerminal`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(
                `${this.baseURL}/networks/${this.network}/tokens/${tokenAddress}/pools`,
                {
                    params: {
                        page: 1
                    },
                    timeout: this.timeout,
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            const pools = response.data?.data || [];
            return pools.slice(0, limit).map(pool => ({
                name: pool.attributes?.name,
                address: pool.attributes?.address,
                dex: pool.relationships?.dex?.data?.id,
                priceUsd: parseFloat(pool.attributes?.base_token_price_usd || 0),
                volume24h: parseFloat(pool.attributes?.volume_usd?.h24 || 0),
                liquidity: parseFloat(pool.attributes?.reserve_in_usd || 0)
            }));
        });
    }

    /**
     * Get network information
     * Useful for debugging and monitoring
     */
    async getNetworkInfo() {
        return this.withRetry(async () => {
            const response = await axios.get(
                `${this.baseURL}/networks/${this.network}`,
                {
                    timeout: this.timeout,
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            const data = response.data?.data?.attributes;
            return {
                name: data?.name,
                chainId: data?.chain_identifier,
                dexCount: data?.dex_count
            };
        });
    }
}

module.exports = GeckoTerminalAPI;

