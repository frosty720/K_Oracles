const KrakenAPI = require('../src/api/KrakenAPI');
const OKXAPI = require('../src/api/OKXAPI');

async function testKrakenAPI() {
    console.log('\n🔍 Testing Kraken API...\n');
    const kraken = new KrakenAPI();
    
    try {
        // Test individual price fetching
        console.log('Testing individual price fetching:');
        const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'];
        
        for (const asset of assets) {
            try {
                const price = await kraken.getPrice(asset);
                console.log(`✅ ${asset}: $${price.toFixed(2)}`);
            } catch (error) {
                console.log(`❌ ${asset}: ${error.message}`);
            }
        }
        
        // Test batch price fetching
        console.log('\nTesting batch price fetching:');
        const prices = await kraken.getPrices(assets);
        console.log('Batch results:', prices);
        
        // Test ticker info for DAI
        console.log('\nTesting DAI ticker info:');
        const daiTicker = await kraken.getTickerInfo('DAI');
        console.log('DAI Ticker:', {
            price: `$${daiTicker.price.toFixed(4)}`,
            bid: `$${daiTicker.bid.toFixed(4)}`,
            ask: `$${daiTicker.ask.toFixed(4)}`,
            volume24h: daiTicker.volume24h.toFixed(2),
            vwap24h: `$${daiTicker.vwap24h.toFixed(4)}`,
            trades24h: daiTicker.trades24h
        });
        
        console.log('\n✅ Kraken API test completed successfully!\n');
    } catch (error) {
        console.error('❌ Kraken API test failed:', error.message);
    }
}

async function testOKXAPI() {
    console.log('\n🔍 Testing OKX API...\n');
    const okx = new OKXAPI();
    
    try {
        // Test individual price fetching
        console.log('Testing individual price fetching:');
        const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'];
        
        for (const asset of assets) {
            try {
                const price = await okx.getPrice(asset);
                console.log(`✅ ${asset}: $${price.toFixed(2)}`);
            } catch (error) {
                console.log(`❌ ${asset}: ${error.message}`);
            }
        }
        
        // Test batch price fetching
        console.log('\nTesting batch price fetching:');
        const prices = await okx.getPrices(assets);
        console.log('Batch results:', prices);
        
        // Test ticker info for DAI
        console.log('\nTesting DAI ticker info:');
        const daiTicker = await okx.getTickerInfo('DAI');
        console.log('DAI Ticker:', {
            price: `$${daiTicker.price.toFixed(4)}`,
            bid: `$${daiTicker.bid.toFixed(4)}`,
            ask: `$${daiTicker.ask.toFixed(4)}`,
            volume24h: daiTicker.volume24h.toFixed(2),
            volumeCcy24h: `$${daiTicker.volumeCcy24h.toFixed(2)}`,
            high24h: `$${daiTicker.high24h.toFixed(4)}`,
            low24h: `$${daiTicker.low24h.toFixed(4)}`
        });
        
        // Test order book
        console.log('\nTesting DAI order book (top 3):');
        const orderBook = await okx.getOrderBook('DAI', 3);
        console.log('Top 3 Bids:', orderBook.bids);
        console.log('Top 3 Asks:', orderBook.asks);
        
        console.log('\n✅ OKX API test completed successfully!\n');
    } catch (error) {
        console.error('❌ OKX API test failed:', error.message);
    }
}

async function runTests() {
    console.log('='.repeat(60));
    console.log('Testing Kraken and OKX API Integration');
    console.log('='.repeat(60));
    
    await testKrakenAPI();
    await testOKXAPI();
    
    console.log('='.repeat(60));
    console.log('All tests completed!');
    console.log('='.repeat(60));
}

runTests().catch(console.error);

