const axios = require('axios');
const PriceSource = require('./PriceSource');

/**
 * CryptoCompare API price source
 */
class CryptoCompareAPI extends PriceSource {
    constructor(config = {}) {
        super('CryptoCompare', config);
        this.baseURL = 'https://min-api.cryptocompare.com/data';
        this.apiKey = config.apiKey;
        this.symbolMap = {
            'BTC': 'BTC',
            'ETH': 'ETH',
            'USDT': 'USDT',
            'USDC': 'USDC',
            'DAI': 'DAI'
        };
    }

    async getPrice(symbol) {
        const cryptoCompareSymbol = this.symbolMap[symbol];
        if (!cryptoCompareSymbol) {
            throw new Error(`Symbol ${symbol} not supported by CryptoCompare`);
        }

        return this.withRetry(async () => {
            const params = {
                fsym: cryptoCompareSymbol,
                tsyms: 'USD'
            };

            const headers = {};
            if (this.apiKey) {
                headers['authorization'] = `Apikey ${this.apiKey}`;
            }

            const response = await axios.get(`${this.baseURL}/price`, {
                params,
                headers,
                timeout: this.timeout
            });

            const price = response.data.USD;
            if (!price) {
                throw new Error(`No price data for ${symbol}`);
            }

            return this.validatePrice(price);
        });
    }

    async getPriceMulti(symbols) {
        const cryptoCompareSymbols = symbols.map(s => this.symbolMap[s]).filter(Boolean);
        if (cryptoCompareSymbols.length === 0) {
            throw new Error('No valid symbols provided');
        }

        return this.withRetry(async () => {
            const params = {
                fsyms: cryptoCompareSymbols.join(','),
                tsyms: 'USD'
            };

            const headers = {};
            if (this.apiKey) {
                headers['authorization'] = `Apikey ${this.apiKey}`;
            }

            const response = await axios.get(`${this.baseURL}/pricemulti`, {
                params,
                headers,
                timeout: this.timeout
            });

            const prices = {};
            for (const [symbol, cryptoCompareSymbol] of Object.entries(this.symbolMap)) {
                if (response.data[cryptoCompareSymbol]?.USD) {
                    prices[symbol] = response.data[cryptoCompareSymbol].USD;
                }
            }

            return prices;
        });
    }

    async getPriceHistorical(symbol, timestamp) {
        const cryptoCompareSymbol = this.symbolMap[symbol];
        if (!cryptoCompareSymbol) {
            throw new Error(`Symbol ${symbol} not supported by CryptoCompare`);
        }

        return this.withRetry(async () => {
            const params = {
                fsym: cryptoCompareSymbol,
                tsyms: 'USD',
                ts: timestamp
            };

            const headers = {};
            if (this.apiKey) {
                headers['authorization'] = `Apikey ${this.apiKey}`;
            }

            const response = await axios.get(`${this.baseURL}/pricehistorical`, {
                params,
                headers,
                timeout: this.timeout
            });

            const price = response.data[cryptoCompareSymbol]?.USD;
            if (!price) {
                throw new Error(`No historical price data for ${symbol}`);
            }

            return this.validatePrice(price);
        });
    }

    async getDailyOHLC(symbol, limit = 30) {
        const cryptoCompareSymbol = this.symbolMap[symbol];
        if (!cryptoCompareSymbol) {
            throw new Error(`Symbol ${symbol} not supported by CryptoCompare`);
        }

        return this.withRetry(async () => {
            const params = {
                fsym: cryptoCompareSymbol,
                tsym: 'USD',
                limit
            };

            const headers = {};
            if (this.apiKey) {
                headers['authorization'] = `Apikey ${this.apiKey}`;
            }

            const response = await axios.get(`${this.baseURL}/v2/histoday`, {
                params,
                headers,
                timeout: this.timeout
            });

            if (!response.data.Data?.Data) {
                throw new Error(`No OHLC data for ${symbol}`);
            }

            return response.data.Data.Data.map(candle => ({
                time: candle.time,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volumeto
            }));
        });
    }

    async getAllPrices() {
        const symbols = Object.keys(this.symbolMap);
        return this.getPriceMulti(symbols);
    }
}

module.exports = CryptoCompareAPI;
