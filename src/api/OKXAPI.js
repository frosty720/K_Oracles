const axios = require('axios');
const PriceSource = require('./PriceSource');

/**
 * OKX API price source
 * Documentation: https://www.okx.com/docs-v5/en/
 */
class OKXAPI extends PriceSource {
    constructor(config = {}) {
        super('OKX', config);
        this.baseURL = 'https://www.okx.com/api/v5';
        this.symbolMap = {
            'BTC': 'BTC-USDT',
            'ETH': 'ETH-USDT',
            'USDT': 'USDT-USD',
            'USDC': 'USDC-USDT',
            'DAI': 'DAI-USDT'
        };
    }

    async getPrice(symbol) {
        const okxSymbol = this.symbolMap[symbol];
        if (!okxSymbol) {
            throw new Error(`Symbol ${symbol} not supported by OKX`);
        }

        // Special case for USDT (should be ~$1)
        if (symbol === 'USDT') {
            return 1.0;
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/market/ticker`, {
                params: { instId: okxSymbol },
                timeout: this.timeout
            });

            // Check for API errors
            if (response.data.code !== '0') {
                throw new Error(`OKX API error: ${response.data.msg || 'Unknown error'}`);
            }

            const data = response.data.data;
            if (!data || data.length === 0) {
                throw new Error(`No price data for ${symbol}`);
            }

            const price = parseFloat(data[0].last);
            return this.validatePrice(price);
        });
    }

    /**
     * Get multiple prices at once
     */
    async getPrices(symbols) {
        const prices = {};
        
        // OKX doesn't support batch ticker requests, so we'll do them in parallel
        const promises = symbols.map(async (symbol) => {
            try {
                prices[symbol] = await this.getPrice(symbol);
            } catch (error) {
                console.error(`${this.name}: Failed to get price for ${symbol}:`, error.message);
                prices[symbol] = null;
            }
        });

        await Promise.allSettled(promises);
        return prices;
    }

    /**
     * Get detailed ticker information
     */
    async getTickerInfo(symbol) {
        const okxSymbol = this.symbolMap[symbol];
        if (!okxSymbol) {
            throw new Error(`Symbol ${symbol} not supported by OKX`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/market/ticker`, {
                params: { instId: okxSymbol },
                timeout: this.timeout
            });

            if (response.data.code !== '0') {
                throw new Error(`OKX API error: ${response.data.msg || 'Unknown error'}`);
            }

            const data = response.data.data;
            if (!data || data.length === 0) {
                throw new Error(`No ticker data for ${symbol}`);
            }

            const ticker = data[0];
            return {
                symbol,
                price: parseFloat(ticker.last),           // Last traded price
                bid: parseFloat(ticker.bidPx),            // Best bid price
                ask: parseFloat(ticker.askPx),            // Best ask price
                bidSize: parseFloat(ticker.bidSz),        // Best bid size
                askSize: parseFloat(ticker.askSz),        // Best ask size
                volume24h: parseFloat(ticker.vol24h),     // 24h trading volume
                volumeCcy24h: parseFloat(ticker.volCcy24h), // 24h trading volume in currency
                open24h: parseFloat(ticker.open24h),      // Open price in past 24h
                high24h: parseFloat(ticker.high24h),      // Highest price in past 24h
                low24h: parseFloat(ticker.low24h),        // Lowest price in past 24h
                timestamp: parseInt(ticker.ts)            // Ticker data generation time
            };
        });
    }

    /**
     * Get order book depth
     */
    async getOrderBook(symbol, depth = 5) {
        const okxSymbol = this.symbolMap[symbol];
        if (!okxSymbol) {
            throw new Error(`Symbol ${symbol} not supported by OKX`);
        }

        return this.withRetry(async () => {
            const response = await axios.get(`${this.baseURL}/market/books`, {
                params: { 
                    instId: okxSymbol,
                    sz: depth
                },
                timeout: this.timeout
            });

            if (response.data.code !== '0') {
                throw new Error(`OKX API error: ${response.data.msg || 'Unknown error'}`);
            }

            const data = response.data.data;
            if (!data || data.length === 0) {
                throw new Error(`No order book data for ${symbol}`);
            }

            return {
                symbol,
                bids: data[0].bids.map(b => ({
                    price: parseFloat(b[0]),
                    size: parseFloat(b[1])
                })),
                asks: data[0].asks.map(a => ({
                    price: parseFloat(a[0]),
                    size: parseFloat(a[1])
                })),
                timestamp: parseInt(data[0].ts)
            };
        });
    }
}

module.exports = OKXAPI;

