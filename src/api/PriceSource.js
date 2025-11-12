/**
 * Base class for price sources
 */
class PriceSource {
    constructor(name, config = {}) {
        this.name = name;
        this.config = config;
        this.timeout = config.timeout || 10000; // 10 seconds default
        this.retries = config.retries || 3;
    }

    /**
     * Get price for a symbol
     * @param {string} symbol - Asset symbol (BTC, ETH, etc.)
     * @returns {Promise<number>} Price in USD
     */
    async getPrice(symbol) {
        throw new Error('getPrice must be implemented by subclass');
    }

    /**
     * Get multiple prices at once
     * @param {string[]} symbols - Array of symbols
     * @returns {Promise<Object>} Object with symbol => price mapping
     */
    async getPrices(symbols) {
        const prices = {};
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
     * Retry wrapper for API calls
     */
    async withRetry(fn, retries = this.retries) {
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                if (i === retries - 1) throw error;
                await this.sleep(1000 * (i + 1)); // Exponential backoff
            }
        }
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Validate price
     */
    validatePrice(price) {
        if (typeof price !== 'number' || isNaN(price) || price <= 0) {
            throw new Error(`Invalid price: ${price}`);
        }
        return price;
    }
}

module.exports = PriceSource;
