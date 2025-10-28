# 🚰 Multi-Network Faucet (Server)

The backend relayer service for the Multi-Network Testnet Faucet. This Node.js application serves as the bridge between users and the blockchain, enabling gasless transactions and managing the security of the faucet system.

## 🎯 Purpose

The server component handles critical functions that make the faucet system secure and user-friendly:

- Processes user requests for testnet ETH
- Manages transaction submissions to multiple networks
- Ensures fair usage through rate limiting
- Handles signature verification for secure claims

## ✨ Features

- **Signature Verification:** Securely verifies ECDSA signatures to authenticate user claims
- **Gasless Transactions:** Pays for the gas fees on behalf of the user, providing a gasless experience
- **Rate Limiting:** Implements rate limiting to prevent abuse and ensure fair distribution of funds
- **Multi-Network Support:** Can be configured to work with multiple testnet networks
- **On-Chain Cooldown:** Enforces the cooldown period defined in the smart contract

---

## 🚀 Quick Start

### 1. Navigate to the server directory

```bash
cd faucet-contract/server
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Create a `.env` file in the server directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the following environment variables:

```env
# Relayer Configuration
RELAYER_PRIVATE_KEY=            # Private key of the relayer account
CORS_ORIGIN=http://localhost:5173  # Frontend application URL

# Sepolia Configuration
SEPOLIA_RPC_URL=               # Sepolia RPC URL from Alchemy/Infura
SEPOLIA_FAUCET_ADDRESS=        # Deployed faucet contract on Sepolia

# Arbitrum Sepolia Configuration
ARBITRUM_SEPOLIA_RPC_URL=      # Arbitrum Sepolia RPC URL
ARBITRUM_SEPOLIA_FAUCET_ADDRESS= # Deployed faucet contract on Arbitrum Sepolia

# Optimism Sepolia Configuration
OPTIMISM_SEPOLIA_RPC_URL=      # Optimism Sepolia RPC URL
OPTIMISM_SEPOLIA_FAUCET_ADDRESS= # Deployed faucet contract on Optimism Sepolia

# Upstash Redis Configuration (for rate limiting)
UPSTASH_REDIS_REST_URL=        # Upstash Redis instance URL
UPSTASH_REDIS_REST_TOKEN=      # Upstash Redis authentication token
```

> **Important Security Notes:**
>
> - Never commit your `.env` file to version control
> - Keep your `RELAYER_PRIVATE_KEY` secure and never share it
> - Make sure the relayer account has sufficient funds for gas fees

````

### 4. Run the Server

```bash
pnpm start
````

---

## 📜 API Endpoints

- `POST /faucet`: Claim tokens from the faucet
- `GET /networks`: Get a list of supported networks
- `POST /can-claim`: Check if a user can claim tokens from the faucet
- `GET /health`: Health check endpoint

---

## 🛠️ Technologies Used

- **Node.js:** A JavaScript runtime built on Chrome's V8 JavaScript engine
- **Express:** A fast, unopinionated, minimalist web framework for Node.js
- **Ethers.js:** A complete and compact library for interacting with the Ethereum blockchain and its ecosystem

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.
