const axios = require('axios');
const PriceSource = require('./PriceSource');

/**
 * KuCoin API price source
 */
class KucoinAPI extends PriceSource {
    constructor(config = {}) {
        super('KuCoin', config);
        this.baseURL = 'https://api.kucoin.com/api/v1';
        this.symbolMap = {
            'BTC': 'BTC-USDT',
            'ETH': 'ETH-USDT',
            'USDT': 'USDT-USD',
            'USDC': 'USDC-USDT',
            'DAI': 'DAI-USDT'
        };
    }

    async getPrice(symbol) {
        const kucoinSymbol = this.symbolMap[symbol];
        if (!kucoinSymbol) {
            throw new Error(`Symbol ${symbol} not supported by KuCoin`);
        }

        // DAI is not available on KuCoin - skip to avoid unnecessary API calls
        if (symbol === 'DAI') {
            throw new Error(`DAI is not available on KuCoin`);
        }

        // Special case for USDT
        if (symbol === 'USDT') {
            return 1.0;
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/market/orderbook/level1`, {
                params: { symbol: kucoinSymbol },
                timeout: this.timeout
            });

            const data = response.data.data;
            if (!data || !data.price) {
                throw new Error(`No price data for ${symbol}`);
            }

            const price = parseFloat(data.price);
            return this.validatePrice(price);
        });
    }

    async get24hrStats(symbol) {
        const kucoinSymbol = this.symbolMap[symbol];
        if (!kucoinSymbol) {
            throw new Error(`Symbol ${symbol} not supported by KuCoin`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/market/stats`, {
                params: { symbol: kucoinSymbol },
                timeout: this.timeout
            });

            const data = response.data.data;
            if (!data) {
                throw new Error(`No stats data for ${symbol}`);
            }

            return {
                symbol: symbol,
                price: parseFloat(data.last),
                change24h: parseFloat(data.changeRate) * 100,
                volume24h: parseFloat(data.vol),
                high24h: parseFloat(data.high),
                low24h: parseFloat(data.low)
            };
        });
    }

    async getAllPrices() {
        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/market/allTickers`, {
                timeout: this.timeout
            });

            const prices = {};
            const tickers = response.data.data.ticker;

            tickers.forEach(ticker => {
                // Map back to our symbols
                for (const [symbol, kucoinSymbol] of Object.entries(this.symbolMap)) {
                    if (ticker.symbol === kucoinSymbol) {
                        prices[symbol] = parseFloat(ticker.last);
                    }
                }
            });

            // Add USDT as $1
            prices['USDT'] = 1.0;

            return prices;
        });
    }

    async getOrderBook(symbol, level = 20) {
        const kucoinSymbol = this.symbolMap[symbol];
        if (!kucoinSymbol) {
            throw new Error(`Symbol ${symbol} not supported by KuCoin`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/market/orderbook/level2_${level}`, {
                params: { symbol: kucoinSymbol },
                timeout: this.timeout
            });

            const data = response.data.data;
            return {
                symbol: symbol,
                bids: data.bids.map(bid => ({
                    price: parseFloat(bid[0]),
                    size: parseFloat(bid[1])
                })),
                asks: data.asks.map(ask => ({
                    price: parseFloat(ask[0]),
                    size: parseFloat(ask[1])
                }))
            };
        });
    }
}

module.exports = KucoinAPI;
