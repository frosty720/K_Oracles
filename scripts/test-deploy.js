const { ethers } = require("hardhat");

/**
 * Test deployment with simple contract
 */
async function main() {
    console.log("🧪 Testing deployment with simple contract...");
    console.log("Network:", hre.network.name);
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "KLC");
    
    try {
        console.log("\n📦 Deploying TestContract...");
        const TestContract = await ethers.getContractFactory("TestContract");
        const testContract = await TestContract.deploy();
        await testContract.waitForDeployment();
        
        const address = await testContract.getAddress();
        console.log("✅ TestContract deployed to:", address);
        
        // Test contract interaction
        const message = await testContract.message();
        console.log("✅ Contract message:", message);
        
    } catch (error) {
        console.error("❌ Test deployment failed:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });
