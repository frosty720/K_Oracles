require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    testnet: {
      url: process.env.KALYCHAIN_TESTNET_RPC || "https://testnetrpc.kalychain.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 3889,
      gas: 5000000,
      gasPrice: 21000000000,
      timeout: 1000000,
    },
    mainnet: {
      url: process.env.KALYCHAIN_MAINNET_RPC || "https://rpc.kalychain.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 3888,
      gas: 5000000,
      gasPrice: 21000000000,
      timeout: 1000000,
    },
  },
  etherscan: {
    // Add KalyChain explorer API key when available
    apiKey: {
      kalychain: process.env.KALYCHAIN_API_KEY || "",
    },
  },
  paths: {
    sources: "./src/contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};
