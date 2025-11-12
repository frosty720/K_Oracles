#!/usr/bin/env node

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const OracleNode = require('./oracle-node/OracleNode');

/**
 * KUSD Oracle Node Entry Point
 */

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Configuration
const config = {
    // Node identification
    nodeId: process.env.ORACLE_NODE_ID || 'kusd-oracle-node-1',
    
    // Blockchain configuration
    rpcUrl: process.env.KALYCHAIN_TESTNET_RPC || 'https://testnetrpc.kalychain.io/rpc',
    privateKey: process.env.PRIVATE_KEY,
    
    // Oracle contract addresses
    oracleAddresses: {
        BTC: process.env.BTC_ORACLE_ADDRESS,
        ETH: process.env.ETH_ORACLE_ADDRESS,
        USDT: process.env.USDT_ORACLE_ADDRESS,
        USDC: process.env.USDC_ORACLE_ADDRESS,
        DAI: process.env.DAI_ORACLE_ADDRESS
    },
    
    // Assets to monitor
    assets: ['BTC', 'ETH', 'USDT', 'USDC', 'DAI'],
    
    // Update configuration
    updateInterval: parseInt(process.env.ORACLE_UPDATE_INTERVAL) || 60000, // 1 minute
    maxDeviation: parseInt(process.env.ORACLE_MAX_DEVIATION) || 1000, // 10%
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info',
    
    // API configurations
    apis: {
        binance: {
            apiKey: process.env.BINANCE_API_KEY,
            secretKey: process.env.BINANCE_SECRET_KEY,
            timeout: 10000
        },
        geckoterminal: {
            timeout: 15000
            // No API key required - free DEX price data
        },
        coinbase: {
            timeout: 10000
        },
        kucoin: {
            apiKey: process.env.KUCOIN_API_KEY,
            secret: process.env.KUCOIN_SECRET,
            passphrase: process.env.KUCOIN_PASSPHRASE,
            timeout: 10000
        },
        cryptocompare: {
            apiKey: process.env.CRYPTOCOMPARE_API_KEY,
            timeout: 10000
        },
        kraken: {
            timeout: 10000
            // No API key required - free public API
        },
        okx: {
            timeout: 10000
            // No API key required - free public API
        }
    }
};

// Validation
function validateConfig() {
    const errors = [];
    
    if (!config.privateKey) {
        errors.push('PRIVATE_KEY environment variable is required');
    }
    
    // Check if at least one oracle address is provided
    const hasOracleAddress = Object.values(config.oracleAddresses).some(addr => addr);
    if (!hasOracleAddress) {
        errors.push('At least one oracle contract address must be provided');
    }
    
    if (errors.length > 0) {
        console.error('Configuration errors:');
        errors.forEach(error => console.error(`  - ${error}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.');
        process.exit(1);
    }
}

// Main function
async function main() {
    console.log('🔮 KUSD Oracle Node Starting...');
    console.log(`Node ID: ${config.nodeId}`);
    console.log(`Network: ${config.rpcUrl}`);
    console.log(`Assets: ${config.assets.join(', ')}`);
    
    // Validate configuration
    validateConfig();
    
    // Filter oracle addresses to only include configured ones
    const configuredOracles = {};
    for (const [asset, address] of Object.entries(config.oracleAddresses)) {
        if (address) {
            configuredOracles[asset] = address;
            console.log(`${asset} Oracle: ${address}`);
        }
    }
    config.oracleAddresses = configuredOracles;
    
    // Create and start oracle node
    const oracleNode = new OracleNode(config);
    
    try {
        await oracleNode.start();
        
        // Graceful shutdown handling
        process.on('SIGINT', async () => {
            console.log('\n🛑 Received SIGINT, shutting down gracefully...');
            await oracleNode.stop();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
            await oracleNode.stop();
            process.exit(0);
        });
        
        // Keep the process running
        console.log('✅ Oracle node is running. Press Ctrl+C to stop.');
        
    } catch (error) {
        console.error('❌ Failed to start oracle node:', error.message);
        process.exit(1);
    }
}

// Handle unhandled errors
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the application
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { config, OracleNode };
