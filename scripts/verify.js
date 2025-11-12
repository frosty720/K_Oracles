const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Verify deployed contracts
 * Standard verification script following web3 best practices
 */
async function main() {
    console.log("🔍 Verifying KUSD Oracle System...");
    console.log("Network:", hre.network.name);
    
    // Load deployment info
    const deploymentFile = path.join(__dirname, '..', 'deployments', `${hre.network.name}.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        throw new Error(`Deployment file not found: ${deploymentFile}`);
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log("Loaded deployment from:", deploymentFile);
    
    const [signer] = await ethers.getSigners();
    console.log("Verifying with account:", signer.address);
    
    // Verify Factory
    console.log("\n📦 Verifying KUSDOracleFactory...");
    const factoryAddress = deployment.contracts.KUSDOracleFactory.address;
    
    try {
        const factory = await ethers.getContractAt("KUSDOracleFactory", factoryAddress);
        // Check if deployer has ward permissions
        const hasWard = await factory.wards(signer.address);
        console.log(`✅ Factory at ${factoryAddress} - Deployer has ward: ${hasWard === 1n}`);
    } catch (error) {
        console.error(`❌ Factory verification failed:`, error.message);
        return;
    }
    
    // Verify individual oracles
    console.log("\n📦 Verifying individual oracles...");
    const oracles = deployment.contracts.oracles;
    
    for (const [asset, oracleInfo] of Object.entries(oracles)) {
        try {
            console.log(`\nVerifying ${asset} oracle...`);
            const oracle = await ethers.getContractAt("KUSDOracle", oracleInfo.address);
            
            // Check basic properties
            const assetName = await oracle.asset();
            const [price, valid] = await oracle.peek();
            const nodeCount = await oracle.getActiveNodeCount();
            
            console.log(`✅ ${asset} Oracle at ${oracleInfo.address}`);
            console.log(`   Asset: ${ethers.decodeBytes32String(assetName)}`);
            console.log(`   Current Price: ${valid ? ethers.formatEther(price) : 'Invalid'}`);
            console.log(`   Registered Nodes: ${nodeCount}`);
            
        } catch (error) {
            console.error(`❌ ${asset} oracle verification failed:`, error.message);
        }
    }
    
    console.log("\n🎉 Verification completed!");
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Verification failed:", error);
        process.exit(1);
    });
