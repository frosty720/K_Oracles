#!/usr/bin/env node

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * Check registered oracle nodes and their status
 */

async function main() {
    console.log('🔍 Checking Oracle Nodes');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    // Setup provider
    const provider = new ethers.JsonRpcProvider(process.env.KALYCHAIN_TESTNET_RPC);
    
    // Load oracle addresses
    const deploymentPath = path.join(__dirname, '../deployments/testnet.json');
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // Load ABI
    const artifactPath = path.join(__dirname, '../artifacts/src/contracts/KUSDOracle.sol/KUSDOracle.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    // Assets to check
    const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'];

    for (const asset of assets) {
        const oracleAddress = deployment.contracts.oracles[asset].address;
        const oracle = new ethers.Contract(oracleAddress, abi, provider);

        console.log(`📊 ${asset} Oracle: ${oracleAddress}`);
        console.log('─────────────────────────────────────────────────────────');

        try {
            // Get price data
            const priceData = await oracle.getPriceData();
            const isFresh = await oracle.isFresh();
            const activeNodeCount = await oracle.getActiveNodeCount();

            console.log(`   💰 Current Price: $${ethers.formatUnits(priceData.price, 18)}`);
            console.log(`   ⏰ Last Update: ${new Date(Number(priceData.timestamp) * 1000).toLocaleString()}`);
            console.log(`   ✅ Valid: ${priceData.valid}`);
            console.log(`   🔄 Fresh: ${isFresh}`);
            console.log(`   👥 Active Nodes: ${activeNodeCount}`);

            // Check specific addresses if provided
            const checkAddresses = process.argv.slice(2);
            if (checkAddresses.length > 0) {
                console.log('');
                console.log('   📋 Node Status:');
                for (const addr of checkAddresses) {
                    if (ethers.isAddress(addr)) {
                        const nodeInfo = await oracle.nodes(addr);
                        console.log(`      ${addr}:`);
                        console.log(`         Active: ${nodeInfo.active}`);
                        console.log(`         Stake: ${nodeInfo.stake}`);
                        console.log(`         Reputation: ${nodeInfo.reputation}`);
                        if (nodeInfo.lastUpdate > 0) {
                            console.log(`         Last Update: ${new Date(Number(nodeInfo.lastUpdate) * 1000).toLocaleString()}`);
                        }
                    }
                }
            }

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('💡 Usage:');
    console.log('   Check all oracles: node scripts/check-nodes.js');
    console.log('   Check specific address: node scripts/check-nodes.js 0x...');
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

