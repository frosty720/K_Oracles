#!/usr/bin/env node

/**
 * Test script for GeckoTerminal API
 * Run with: node test-geckoterminal.js
 */

const GeckoTerminalAPI = require('../src/api/GeckoTerminalAPI');

async function testGeckoTerminal() {
    console.log('🧪 Testing GeckoTerminal API...\n');
    
    const api = new GeckoTerminalAPI({ timeout: 15000 });
    
    const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'];
    
    console.log('📊 Fetching individual prices:');
    console.log('='.repeat(50));
    
    for (const asset of assets) {
        try {
            const price = await api.getPrice(asset);
            console.log(`✅ ${asset}: $${price.toFixed(2)}`);
        } catch (error) {
            console.log(`❌ ${asset}: ${error.message}`);
        }
    }
    
    console.log('\n📊 Fetching all prices at once (batch):');
    console.log('='.repeat(50));
    
    try {
        const prices = await api.getPrices(assets);
        for (const [asset, price] of Object.entries(prices)) {
            console.log(`✅ ${asset}: $${price.toFixed(2)}`);
        }
    } catch (error) {
        console.log(`❌ Batch fetch failed: ${error.message}`);
    }
    
    console.log('\n📊 Fetching DAI pool information:');
    console.log('='.repeat(50));
    
    try {
        const pools = await api.getTopPools('DAI', 3);
        pools.forEach((pool, i) => {
            console.log(`\nPool ${i + 1}:`);
            console.log(`  Name: ${pool.name}`);
            console.log(`  DEX: ${pool.dex}`);
            console.log(`  Price: $${pool.priceUsd.toFixed(4)}`);
            console.log(`  24h Volume: $${pool.volume24h.toLocaleString()}`);
            console.log(`  Liquidity: $${pool.liquidity.toLocaleString()}`);
        });
    } catch (error) {
        console.log(`❌ Pool fetch failed: ${error.message}`);
    }
    
    console.log('\n✅ GeckoTerminal API test complete!\n');
}

testGeckoTerminal().catch(console.error);

