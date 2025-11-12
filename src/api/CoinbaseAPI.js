const axios = require('axios');
const PriceSource = require('./PriceSource');

/**
 * Coinbase API price source
 */
class CoinbaseAPI extends PriceSource {
    constructor(config = {}) {
        super('Coinbase', config);
        this.baseURL = 'https://api.coinbase.com/v2';
        this.symbolMap = {
            'BTC': 'BTC',
            'ETH': 'ETH',
            'USDT': 'USDT',
            'USDC': 'USDC',
            'DAI': 'DAI'
        };
    }

    async getPrice(symbol) {
        const coinbaseSymbol = this.symbolMap[symbol];
        if (!coinbaseSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Coinbase`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/exchange-rates`, {
                params: { currency: coinbaseSymbol },
                timeout: this.timeout
            });

            const price = parseFloat(response.data.data.rates.USD);
            return this.validatePrice(price);
        });
    }

    async getSpotPrice(symbol) {
        const coinbaseSymbol = this.symbolMap[symbol];
        if (!coinbaseSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Coinbase`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/prices/${coinbaseSymbol}-USD/spot`, {
                timeout: this.timeout
            });

            const price = parseFloat(response.data.data.amount);
            return this.validatePrice(price);
        });
    }

    async getBuyPrice(symbol) {
        const coinbaseSymbol = this.symbolMap[symbol];
        if (!coinbaseSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Coinbase`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/prices/${coinbaseSymbol}-USD/buy`, {
                timeout: this.timeout
            });

            const price = parseFloat(response.data.data.amount);
            return this.validatePrice(price);
        });
    }

    async getSellPrice(symbol) {
        const coinbaseSymbol = this.symbolMap[symbol];
        if (!coinbaseSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Coinbase`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/prices/${coinbaseSymbol}-USD/sell`, {
                timeout: this.timeout
            });

            const price = parseFloat(response.data.data.amount);
            return this.validatePrice(price);
        });
    }

    async getAllPrices() {
        const prices = {};
        const symbols = Object.keys(this.symbolMap);

        const promises = symbols.map(async (symbol) => {
            try {
                prices[symbol] = await this.getPrice(symbol);
            } catch (error) {
                console.error(`Coinbase: Failed to get price for ${symbol}:`, error.message);
                prices[symbol] = null;
            }
        });

        await Promise.allSettled(promises);
        return prices;
    }

    async getHistoricalPrices(symbol, period = 'day') {
        const coinbaseSymbol = this.symbolMap[symbol];
        if (!coinbaseSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Coinbase`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/prices/${coinbaseSymbol}-USD/historic`, {
                params: { period },
                timeout: this.timeout
            });

            return response.data.data.prices.map(price => ({
                price: parseFloat(price.price),
                time: price.time
            }));
        });
    }
}

module.exports = CoinbaseAPI;
