const axios = require('axios');
const PriceSource = require('./PriceSource');

/**
 * CoinGecko API price source
 */
class CoinGeckoAPI extends PriceSource {
    constructor(config = {}) {
        super('CoinGecko', config);
        this.baseURL = 'https://api.coingecko.com/api/v3';
        this.apiKey = config.apiKey;
        this.symbolMap = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'USDT': 'tether',
            'USDC': 'usd-coin',
            'DAI': 'dai'
        };
    }

    async getPrice(symbol) {
        const coinId = this.symbolMap[symbol];
        if (!coinId) {
            throw new Error(`Symbol ${symbol} not supported by CoinGecko`);
        }

        return this.withRetry(async () => {
            const params = {
                ids: coinId,
                vs_currencies: 'usd',
                include_24hr_change: false
            };

            if (this.apiKey) {
                params.x_cg_demo_api_key = this.apiKey;
            }

            const response = await axios.get(`${this.baseURL}/simple/price`, {
                params,
                timeout: this.timeout
            });

            const price = response.data[coinId]?.usd;
            if (!price) {
                throw new Error(`No price data for ${symbol}`);
            }

            return this.validatePrice(price);
        });
    }

    async getPriceWithDetails(symbol) {
        const coinId = this.symbolMap[symbol];
        if (!coinId) {
            throw new Error(`Symbol ${symbol} not supported by CoinGecko`);
        }

        return this.withRetry(async () => {
            const params = {
                ids: coinId,
                vs_currencies: 'usd',
                include_market_cap: true,
                include_24hr_vol: true,
                include_24hr_change: true,
                include_last_updated_at: true
            };

            if (this.apiKey) {
                params.x_cg_demo_api_key = this.apiKey;
            }

            const response = await axios.get(`${this.baseURL}/simple/price`, {
                params,
                timeout: this.timeout
            });

            const data = response.data[coinId];
            if (!data) {
                throw new Error(`No price data for ${symbol}`);
            }

            return {
                symbol: symbol,
                price: data.usd,
                marketCap: data.usd_market_cap,
                volume24h: data.usd_24h_vol,
                change24h: data.usd_24h_change,
                lastUpdated: data.last_updated_at
            };
        });
    }

    async getAllPrices() {
        const coinIds = Object.values(this.symbolMap).join(',');

        return this.withRetry(async () => {
            const params = {
                ids: coinIds,
                vs_currencies: 'usd'
            };

            if (this.apiKey) {
                params.x_cg_demo_api_key = this.apiKey;
            }

            const response = await axios.get(`${this.baseURL}/simple/price`, {
                params,
                timeout: this.timeout
            });

            const prices = {};
            for (const [symbol, coinId] of Object.entries(this.symbolMap)) {
                const price = response.data[coinId]?.usd;
                if (price) {
                    prices[symbol] = price;
                }
            }

            return prices;
        });
    }

    async getHistoricalPrice(symbol, date) {
        const coinId = this.symbolMap[symbol];
        if (!coinId) {
            throw new Error(`Symbol ${symbol} not supported by CoinGecko`);
        }

        // Format date as DD-MM-YYYY
        const formattedDate = date.toLocaleDateString('en-GB');

        return this.withRetry(async () => {
            const params = {
                date: formattedDate
            };

            if (this.apiKey) {
                params.x_cg_demo_api_key = this.apiKey;
            }

            const response = await axios.get(`${this.baseURL}/coins/${coinId}/history`, {
                params,
                timeout: this.timeout
            });

            const price = response.data.market_data?.current_price?.usd;
            if (!price) {
                throw new Error(`No historical price data for ${symbol} on ${formattedDate}`);
            }

            return this.validatePrice(price);
        });
    }
}

module.exports = CoinGeckoAPI;
