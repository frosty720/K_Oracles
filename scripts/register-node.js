#!/usr/bin/env node

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

/**
 * Register a new oracle node address
 * This allows a different wallet to submit price updates
 */

async function main() {
    // Get node address from command line or environment
    const newNodeAddress = process.argv[2] || process.env.NEW_NODE_ADDRESS;
    
    if (!newNodeAddress) {
        console.error('❌ Error: Please provide node address');
        console.log('Usage: node scripts/register-node.js <NODE_ADDRESS>');
        console.log('   or: NEW_NODE_ADDRESS=0x... node scripts/register-node.js');
        process.exit(1);
    }

    // Validate address
    if (!ethers.isAddress(newNodeAddress)) {
        console.error('❌ Error: Invalid Ethereum address');
        process.exit(1);
    }

    console.log('🔧 Registering Oracle Node');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📍 New Node Address: ${newNodeAddress}`);
    console.log('');

    // Setup provider and signer (using deployer wallet)
    const provider = new ethers.JsonRpcProvider(process.env.KALYCHAIN_TESTNET_RPC);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`🔑 Deployer Address: ${signer.address}`);
    console.log('');

    // Load oracle addresses
    const deploymentPath = path.join(__dirname, '../deployments/testnet.json');
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // Load ABI
    const artifactPath = path.join(__dirname, '../artifacts/src/contracts/KUSDOracle.sol/KUSDOracle.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    // Assets to register
    const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'];
    const stake = 0; // No stake required for testnet

    console.log('📝 Registering node on all oracle contracts...');
    console.log('');

    for (const asset of assets) {
        const oracleAddress = deployment.contracts.oracles[asset].address;
        const oracle = new ethers.Contract(oracleAddress, abi, signer);

        try {
            console.log(`⏳ ${asset} Oracle (${oracleAddress})...`);
            
            // Check if node is already registered
            const nodeInfo = await oracle.nodes(newNodeAddress);
            if (nodeInfo.active) {
                console.log(`   ✅ Already registered and active`);
                continue;
            }

            // Register node
            const tx = await oracle.registerNode(newNodeAddress, stake, {
                type: 0, // Legacy transaction for KalyChain
                gasLimit: 500000,
                gasPrice: ethers.parseUnits('21', 'gwei')
            });

            console.log(`   📤 Transaction: ${tx.hash}`);
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log(`   ✅ Registered successfully`);
            } else {
                console.log(`   ❌ Transaction failed`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Node registration complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log(`1. Update oracle/.env with: PRIVATE_KEY=${newNodeAddress.slice(0, 10)}...`);
    console.log('2. Fund the new address with ~10-20 KLC for gas');
    console.log('3. Start the oracle node: npm start');
    console.log('');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

