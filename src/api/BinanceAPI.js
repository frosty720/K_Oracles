const axios = require('axios');
const PriceSource = require('./PriceSource');

/**
 * Binance API price source
 */
class BinanceAPI extends PriceSource {
    constructor(config = {}) {
        super('Binance', config);
        this.baseURL = 'https://api.binance.com/api/v3';
        this.symbolMap = {
            'BTC': 'BTCUSDT',
            'ETH': 'ETHUSDT',
            'USDT': 'USDTUSD',
            'USDC': 'USDCUSDT',
            'DAI': 'DAIUSDT'
        };
    }

    async getPrice(symbol) {
        const binanceSymbol = this.symbolMap[symbol];
        if (!binanceSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Binance`);
        }

        // DAI is delisted on Binance - skip to avoid unnecessary API calls
        if (symbol === 'DAI') {
            throw new Error(`DAI is not available on Binance (delisted)`);
        }

        // Special case for USDT (should be ~$1)
        if (symbol === 'USDT') {
            return 1.0;
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/ticker/price`, {
                params: { symbol: binanceSymbol },
                timeout: this.timeout
            });

            const price = parseFloat(response.data.price);
            return this.validatePrice(price);
        });
    }

    async get24hrStats(symbol) {
        const binanceSymbol = this.symbolMap[symbol];
        if (!binanceSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Binance`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/ticker/24hr`, {
                params: { symbol: binanceSymbol },
                timeout: this.timeout
            });

            return {
                symbol: symbol,
                price: parseFloat(response.data.lastPrice),
                change24h: parseFloat(response.data.priceChangePercent),
                volume24h: parseFloat(response.data.volume),
                high24h: parseFloat(response.data.highPrice),
                low24h: parseFloat(response.data.lowPrice)
            };
        });
    }

    async getAllPrices() {
        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/ticker/price`, {
                timeout: this.timeout
            });

            const prices = {};
            response.data.forEach(ticker => {
                // Map back to our symbols
                for (const [symbol, binanceSymbol] of Object.entries(this.symbolMap)) {
                    if (ticker.symbol === binanceSymbol) {
                        prices[symbol] = parseFloat(ticker.price);
                    }
                }
            });

            // Add USDT as $1
            prices['USDT'] = 1.0;

            return prices;
        });
    }
}

module.exports = BinanceAPI;
