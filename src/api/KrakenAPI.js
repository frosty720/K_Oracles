const axios = require('axios');
const PriceSource = require('./PriceSource');

/**
 * Kraken API price source
 * Documentation: https://docs.kraken.com/rest/
 */
class KrakenAPI extends PriceSource {
    constructor(config = {}) {
        super('Kraken', config);
        this.baseURL = 'https://api.kraken.com/0/public';
        this.symbolMap = {
            'BTC': 'XBTUSD',
            'ETH': 'ETHUSD',
            'USDT': 'USDTUSD',
            'USDC': 'USDCUSD',
            'DAI': 'DAIUSD'
        };
    }

    async getPrice(symbol) {
        const krakenSymbol = this.symbolMap[symbol];
        if (!krakenSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Kraken`);
        }

        // Special case for USDT and USDC (should be ~$1)
        if (symbol === 'USDT' || symbol === 'USDC') {
            return 1.0;
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/Ticker`, {
                params: { pair: krakenSymbol },
                timeout: this.timeout
            });

            // Check for API errors
            if (response.data.error && response.data.error.length > 0) {
                throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
            }

            // Kraken returns data with the pair name as key
            const result = response.data.result;
            const pairData = result[krakenSymbol] || result[Object.keys(result)[0]];
            
            if (!pairData) {
                throw new Error(`No price data for ${symbol}`);
            }

            // 'c' is the last trade closed array [price, lot volume]
            const price = parseFloat(pairData.c[0]);
            return this.validatePrice(price);
        });
    }

    /**
     * Get multiple prices at once (batch request)
     */
    async getPrices(symbols) {
        const krakenSymbols = symbols
            .map(s => this.symbolMap[s])
            .filter(s => s)
            .join(',');

        if (!krakenSymbols) {
            return {};
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/Ticker`, {
                params: { pair: krakenSymbols },
                timeout: this.timeout
            });

            // Check for API errors
            if (response.data.error && response.data.error.length > 0) {
                throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
            }

            const result = response.data.result;
            const prices = {};

            // Map Kraken pair names back to our symbols
            for (const [symbol, krakenSymbol] of Object.entries(this.symbolMap)) {
                if (symbols.includes(symbol)) {
                    // Handle stablecoins
                    if (symbol === 'USDT' || symbol === 'USDC') {
                        prices[symbol] = 1.0;
                        continue;
                    }

                    const pairData = result[krakenSymbol] || result[Object.keys(result).find(k => k.includes(symbol))];
                    if (pairData && pairData.c) {
                        try {
                            prices[symbol] = this.validatePrice(parseFloat(pairData.c[0]));
                        } catch (error) {
                            prices[symbol] = null;
                        }
                    } else {
                        prices[symbol] = null;
                    }
                }
            }

            return prices;
        });
    }

    /**
     * Get ticker information including volume and VWAP
     */
    async getTickerInfo(symbol) {
        const krakenSymbol = this.symbolMap[symbol];
        if (!krakenSymbol) {
            throw new Error(`Symbol ${symbol} not supported by Kraken`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/Ticker`, {
                params: { pair: krakenSymbol },
                timeout: this.timeout
            });

            if (response.data.error && response.data.error.length > 0) {
                throw new Error(`Kraken API error: ${response.data.error.join(', ')}`);
            }

            const result = response.data.result;
            const pairData = result[krakenSymbol] || result[Object.keys(result)[0]];

            if (!pairData) {
                throw new Error(`No ticker data for ${symbol}`);
            }

            return {
                symbol,
                price: parseFloat(pairData.c[0]),           // Last trade price
                bid: parseFloat(pairData.b[0]),             // Best bid price
                ask: parseFloat(pairData.a[0]),             // Best ask price
                volume24h: parseFloat(pairData.v[1]),       // 24h volume
                vwap24h: parseFloat(pairData.p[1]),         // 24h volume weighted average price
                trades24h: parseInt(pairData.t[1]),         // 24h number of trades
                low24h: parseFloat(pairData.l[1]),          // 24h low
                high24h: parseFloat(pairData.h[1]),         // 24h high
                open: parseFloat(pairData.o)                // Opening price
            };
        });
    }
}

module.exports = KrakenAPI;

