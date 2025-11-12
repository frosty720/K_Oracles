# KUSD Oracle System

A custom oracle system for the KUSD stablecoin, providing reliable price feeds for collateral assets on KalyChain. Currently centralized for testnet, with a clear roadmap to full decentralization.

## 🏗️ Architecture

### Smart Contracts
- **KUSDOracle**: Individual oracle contract for each asset (BTC, ETH, etc.)
- **KUSDOracleFactory**: Factory for deploying and managing oracle contracts

### Oracle Nodes
- **Node.js application** that fetches prices from multiple sources
- **Multi-source validation** with median calculation
- **Automatic price updates** every minute
- **Health monitoring** and alerting

### Price Sources
- **Binance API** - Major CEX with high liquidity
- **GeckoTerminal API** - DEX aggregator (Uniswap, Curve, etc.) - Free, no API key required
- **Coinbase API** - Trusted US-based exchange
- **KuCoin API** - Global exchange with wide coverage
- **CryptoCompare API** - Multi-source aggregation
- **Kraken API** - Established exchange (since 2011) - Free, no API key required
- **OKX API** - Major global exchange with high volume - Free, no API key required

## 🚀 Quick Start

### 1. Installation
```bash
npm install
```

### 2. Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Deploy Contracts
```bash
# Compile contracts
npm run build

# Deploy to testnet
npm run deploy:testnet

# Deploy to mainnet
npm run deploy:mainnet
```

### 4. Start Oracle Node
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 📋 Configuration

### Environment Variables

#### Network Configuration
```bash
KALYCHAIN_TESTNET_RPC=https://testnetrpc.kalychain.io/rpc
KALYCHAIN_MAINNET_RPC=https://rpc.kalychain.io/rpc
PRIVATE_KEY=your_private_key_here
```

#### Oracle Configuration
```bash
ORACLE_NODE_ID=kusd-oracle-node-1
ORACLE_UPDATE_INTERVAL=60000  # 1 minute
ORACLE_MAX_DEVIATION=1000     # 10%
```

#### API Keys (Optional - all sources work without keys)
```bash
# Optional: Higher rate limits with API keys
BINANCE_API_KEY=your_binance_api_key
CRYPTOCOMPARE_API_KEY=your_cryptocompare_api_key

# GeckoTerminal - No API key required (free DEX data)
```

#### Contract Addresses (filled after deployment)
```bash
KUSD_ORACLE_FACTORY=0x...
BTC_ORACLE_ADDRESS=0x...
ETH_ORACLE_ADDRESS=0x...
USDT_ORACLE_ADDRESS=0x...
USDC_ORACLE_ADDRESS=0x...
DAI_ORACLE_ADDRESS=0x...
```

## 🔧 Development

### Running Tests
```bash
npm test
```

### Local Development
```bash
# Start local hardhat node
npm run node

# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost

# Start oracle node
npm run dev
```

### Code Structure
```
src/
├── contracts/           # Solidity contracts
│   ├── KUSDOracle.sol
│   └── KUSDOracleFactory.sol
├── api/                 # Price source APIs
│   ├── BinanceAPI.js
│   ├── GeckoTerminalAPI.js
│   ├── CoinbaseAPI.js
│   ├── KucoinAPI.js
│   ├── CryptoCompareAPI.js
│   ├── KrakenAPI.js
│   ├── OKXAPI.js
│   └── CoinGeckoAPI.js  # (deprecated, not used)
├── oracle-node/         # Oracle node software
│   └── OracleNode.js
└── index.js            # Main entry point
```

## 📊 Oracle Node Features

### Price Validation
- **Multi-source aggregation**: Fetches from 5+ sources
- **Median calculation**: Uses median to filter outliers
- **Deviation limits**: Rejects prices >10% from median
- **Staleness detection**: Marks old prices as invalid

### Health Monitoring
- **Blockchain connectivity**: Monitors RPC connection
- **Contract health**: Checks oracle contract responses
- **API availability**: Tests all price source APIs
- **Automatic alerts**: Sends notifications on failures

### Security Features
- **Node authorization**: Only registered nodes can update prices
- **Authorization system**: Ward-based permissions (no token staking yet)
- **Emergency controls**: Governance can invalidate prices
- **Circuit breakers**: Automatic stops on anomalies

## 🔌 Integration with KUSD DSS

### Spotter Integration
```solidity
// Connect oracles to KUSD spotter
spotter.file("BTC-A", "pip", BTC_ORACLE_ADDRESS);
spotter.file("ETH-A", "pip", ETH_ORACLE_ADDRESS);
spotter.file("USDT-A", "pip", USDT_ORACLE_ADDRESS);
spotter.file("USDC-A", "pip", USDC_ORACLE_ADDRESS);
spotter.file("DAI-A", "pip", DAI_ORACLE_ADDRESS);
```

### Price Reading
```solidity
// DSS contracts call this automatically
(bytes32 price, bool valid) = oracle.peek();
```

## 🗺️ Decentralization Roadmap

### Phase 1: Testnet (Current)
- **Single oracle node** (deployer only)
- **Purpose**: Testing and development
- **Security**: Centralized but sufficient for testnet

### Phase 2: Mainnet Launch (Month 2-3)
- **3 oracle nodes** on different servers/providers
- **Purpose**: Production launch with redundancy
- **Security**: Semi-decentralized, trusted operators

### Phase 3: Public Network (Month 3-4)
- **Open oracle network** to community
- **KUSD staking** and reward system
- **Economic incentives** for oracle operators

### Phase 4: DAO Governance (Month 6)
- **KalyDAO control** of oracle parameters
- **Community governance** of node registration
- **Full decentralization** achieved

## 🖥️ Production Deployment

### Server Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB+
- **Storage**: 20GB SSD
- **Network**: Reliable internet connection
- **Uptime**: 99.9%+ required

### Recommended Setup
```bash
# Use PM2 for process management
npm install -g pm2

# Start oracle node with PM2
pm2 start src/index.js --name kusd-oracle

# Setup auto-restart
pm2 startup
pm2 save
```

### Monitoring
```bash
# Check node status
pm2 status

# View logs
pm2 logs kusd-oracle

# Monitor resources
pm2 monit
```

## 🚨 Alerts & Monitoring

### Health Checks
- **Price update failures**: >5 consecutive failures
- **API source failures**: >50% sources down
- **Blockchain connectivity**: RPC connection lost
- **Large price movements**: >10% in 5 minutes

### Alert Channels
- **Discord webhooks**: Real-time notifications
- **Email alerts**: Critical issues
- **Slack integration**: Team notifications
- **Log files**: Detailed error tracking

## 🔐 Security Considerations

### Node Security
- **Private key protection**: Use hardware wallets or HSMs
- **Network security**: VPN and firewall protection
- **Access control**: Limited SSH access
- **Regular updates**: Keep software updated

### Oracle Security
- **Multi-source validation**: Prevents single source manipulation
- **Deviation limits**: Rejects extreme price movements
- **Time-based validation**: Prevents replay attacks
- **Emergency controls**: Governance override capabilities

## 📈 Performance Metrics

### Target Metrics
- **Update frequency**: Every 60 seconds
- **Price accuracy**: <1% deviation from market
- **Uptime**: 99.9%+
- **Response time**: <10 seconds for price updates

### Monitoring Dashboard
- **Price charts**: Real-time price tracking
- **Source status**: API health monitoring
- **Node performance**: Update success rates
- **System health**: Overall system status

## 🛠️ Troubleshooting

### Common Issues

#### Oracle Node Won't Start
```bash
# Check configuration
npm run test

# Verify network connection
curl https://testnetrpc.kalychain.io/rpc

# Check private key
echo $PRIVATE_KEY
```

#### Price Updates Failing
```bash
# Check API keys
curl "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"

# Verify contract addresses
npx hardhat console --network testnet
```

#### High Gas Costs
```bash
# Adjust gas price in config
ORACLE_GAS_PRICE=20000000000  # 20 gwei
```

## 📞 Support

### Documentation
- **Smart Contract Docs**: See contract comments
- **API Documentation**: Check individual API files
- **Deployment Guide**: Follow scripts/deploy.js

### Community
- **GitHub Issues**: Report bugs and feature requests
- **Discord**: Join the KUSD community
- **Email**: support@kusd.io

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

# Contract Addresses (deployed to testnet)
KUSD_ORACLE_FACTORY=0x1D6c4196e135F0Fa1Ad5c5e28E0aed6BD4C0a739
BTC_ORACLE_ADDRESS=0x85a8386367755965C95E31B06778B2c89082E316
ETH_ORACLE_ADDRESS=0x935216C74e1838E7090f31756ce0f64a34A5aAce
USDT_ORACLE_ADDRESS=0xf8Be6Ed01e7AE968118cf3db72E7641C59A9Dc4f
USDC_ORACLE_ADDRESS=0x930e5F6D686A19794bc7a1615a40032182D359D7
DAI_ORACLE_ADDRESS=0x301F4fbd60156568d87932c42b3C17Bd5F0f33BD
