const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

/**
 * Deploy KUSD Oracle System
 * Standard web3 deployment script following industry best practices
 */
async function main() {
    console.log("🚀 Deploying KUSD Oracle System...");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", hre.network.config.chainId);

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "KLC");

    // Check minimum balance
    const minBalance = ethers.parseEther("0.1"); // 0.1 KLC minimum
    if (balance < minBalance) {
        throw new Error(`Insufficient balance. Need at least 0.1 KLC, have ${ethers.formatEther(balance)} KLC`);
    }

    // Assets to deploy oracles for
    const assets = ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'];
    
    // Deploy Oracle Factory with manual gas settings
    console.log("\n📦 Deploying KUSDOracleFactory...");
    const OracleFactory = await ethers.getContractFactory("KUSDOracleFactory");
    const factory = await OracleFactory.deploy({
        gasLimit: 4000000,
        gasPrice: 21000000000
    });
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("✅ KUSDOracleFactory deployed to:", factoryAddress);

    // Deploy individual oracles
    const oracleAddresses = {};
    console.log("\n📦 Deploying individual oracles...");
    
    for (const asset of assets) {
        console.log(`\nDeploying oracle for ${asset}...`);
        
        // Convert asset to bytes32
        const assetBytes32 = ethers.encodeBytes32String(asset);
        
        // Deploy oracle through factory with manual gas settings
        const tx = await factory.deployOracle(assetBytes32, {
            gasLimit: 4000000,
            gasPrice: 21000000000
        });
        const receipt = await tx.wait();
        
        // Get oracle address from event
        const event = receipt.logs.find(log => {
            try {
                const parsed = factory.interface.parseLog(log);
                return parsed.name === 'OracleDeployed';
            } catch {
                return false;
            }
        });
        
        if (event) {
            const parsed = factory.interface.parseLog(event);
            const oracleAddress = parsed.args.oracle;
            oracleAddresses[asset] = oracleAddress;
            console.log(`✅ ${asset} Oracle deployed to: ${oracleAddress}`);
        } else {
            console.error(`❌ Failed to get oracle address for ${asset}`);
        }
    }

    // Setup oracle nodes (register deployer as initial node)
    console.log("\n🔧 Setting up oracle nodes...");
    const stake = 0; // No actual staking implemented yet - just authorization
    
    for (const [asset, oracleAddress] of Object.entries(oracleAddresses)) {
        console.log(`Setting up node for ${asset}...`);
        
        const oracle = await ethers.getContractAt("KUSDOracle", oracleAddress);
        
        // Register deployer as oracle node with manual gas settings
        const tx = await oracle.registerNode(deployer.address, stake, {
            gasLimit: 500000,
            gasPrice: 21000000000
        });
        await tx.wait();
        
        console.log(`✅ Registered node for ${asset}`);
    }

    // Save deployment info to standard deployments directory
    const deploymentInfo = {
        network: hre.network.name,
        chainId: hre.network.config.chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        gasUsed: "TBD", // Will be calculated if needed
        contracts: {
            KUSDOracleFactory: {
                address: factoryAddress,
                constructorArgs: []
            },
            oracles: Object.fromEntries(
                Object.entries(oracleAddresses).map(([asset, address]) => [
                    asset,
                    {
                        address: address,
                        asset: asset,
                        constructorArgs: [ethers.encodeBytes32String(asset)]
                    }
                ])
            )
        },
        assets: assets
    };

    // Save to standard deployments directory
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

    // Deployment Summary
    console.log("\n🎉 Deployment Summary:");
    console.log("=".repeat(50));
    console.log(`Network: ${hre.network.name} (Chain ID: ${hre.network.config.chainId})`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Factory: ${factoryAddress}`);
    console.log("\nOracle Contracts:");
    for (const [asset, address] of Object.entries(oracleAddresses)) {
        console.log(`  ${asset}: ${address}`);
    }

    console.log("\n📋 Next Steps:");
    console.log("1. Update your .env file with the contract addresses below");
    console.log("2. Start oracle nodes: npm start");
    console.log("3. Monitor oracle health and price updates");
    console.log("4. Integrate with KUSD system (update spotter contracts)");

    console.log("\n⚠️  IMPORTANT SECURITY NOTICE:");
    console.log("- This is a CENTRALIZED oracle system (only deployer can update prices)");
    console.log("- No economic staking is implemented (stake values are placeholders)");
    console.log("- Suitable for testnet and early launch, but plan for decentralization");
    console.log("- Consider adding more oracle nodes before mainnet launch");

    console.log("\n📝 Add these to your .env file:");
    console.log(`KUSD_ORACLE_FACTORY=${factoryAddress}`);
    for (const [asset, address] of Object.entries(oracleAddresses)) {
        console.log(`${asset}_ORACLE_ADDRESS=${address}`);
    }

    console.log("\n🔗 Integration with KUSD DSS:");
    console.log("// In your KUSD deployment script:");
    for (const [asset, address] of Object.entries(oracleAddresses)) {
        console.log(`spotter.file("${asset}-A", "pip", "${address}");`);
    }

    console.log("\n✅ Deployment completed successfully!");
}

// Error handling
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
