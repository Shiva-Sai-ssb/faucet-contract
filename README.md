# 🚰 Multi-Network Testnet Faucet (Contract-Based)

A **contract-based faucet** with a **signature-verifying relayer backend** that enables gasless testnet ETH claims across multiple networks.
Users sign structured messages, and a backend relayer verifies, funds gas, and executes on-chain faucet claims securely.

---

## ✨ Features

* 🔐 **Signature-Based Claims** — Users sign hashed messages, relayer pays gas
* ⛓️ **Smart Contract Enforcement** — On-chain nonce, cooldown, and replay protection
* 🌐 **Multi-Network Support** — Works with Sepolia, Arbitrum Sepolia, Optimism Sepolia
* ⏱️ **24-Hour Cooldown** — Enforced directly in the contract
* 🧱 **Rate Limiting** — 20 claims/hour per network (server side)
* 🛡️ **Secure Verification** — ECDSA recovery and expiry validation
* ⚙️ **Relayer Architecture** — Abstracts contract interactions for a gasless UX

---

## 🏗️ Architecture

<div align="center">

| Frontend (User App)                                                                                    | Relayer (Backend)                                                                                                                  | Contract (On-Chain)                                                                                                                             |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. User signs message**<br>- address<br>- nonce<br>- deadline (≈5m)<br>- chainId<br>- faucet address | **2. Relayer verifies & submits**<br>- ECDSA recovers signer<br>- checks deadline<br>- applies rate limits<br>- encodes & sends tx | **3. Contract validates & drips ETH**<br>- verifies nonce<br>- enforces cooldown<br>- verifies signature<br>- sends 0.01 ETH + increments nonce |

</div>

### Flow Overview

1. **Frontend** — User signs claim parameters using their wallet
2. **Relayer** — Validates signature, checks cooldown and rate limits, broadcasts the transaction
3. **Contract** — Verifies message integrity and executes ETH drip if conditions pass

### Responsibilities

* **Contract:** Handles nonce tracking, cooldown, and signature validation
* **Relayer:** Performs signature verification, rate-limiting, and gas payment
* **Frontend:** Provides signing logic, claim eligibility checks, and UI

---

## 📦 Project Structure

```
faucet-contract/
├── contracts/
│   ├── Faucet.sol              # Main faucet contract
│   └── interfaces/
│       └── IFaucet.sol         # Interface definition
├── src/
│   ├── index.js                # Express app & route definitions
│   ├── config.js               # Network configs & rate limits
│   └── faucet.js               # Core faucet logic
├── .env.example                # Example environment variables
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Shiva-Sai-ssb/faucet-contract.git
cd faucet-contract
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Set these variables:

* `RELAYER_PRIVATE_KEY` — private key for the relayer wallet
* `SEPOLIA_RPC_URL`, `ARBITRUM_SEPOLIA_RPC_URL`, `OPTIMISM_SEPOLIA_RPC_URL`
* `SEPOLIA_FAUCET_ADDRESS`, `ARBITRUM_SEPOLIA_FAUCET_ADDRESS`, `OPTIMISM_SEPOLIA_FAUCET_ADDRESS`
* `CORS_ORIGIN`

### 3. Deploy Faucet Contract

Deploy `contracts/Faucet.sol` using [Remix](https://remix.ethereum.org):

1. Paste contract contents
2. Compile with Solidity `0.8.28`
3. Deploy to desired testnets
4. Fund each deployed contract with test ETH
5. Add deployed addresses to `.env`

**Contract Key Features**

* Sends **0.01 ETH** per claim (configurable)
* Enforces a **24-hour cooldown** per user
* Uses **nonce and signature validation** for replay protection
* Allows owner withdrawal of unused funds

### 4. Run the Relayer

```bash
pnpm start
```

Expected output:

```
Configured: Sepolia (chainId: 11155111)
Configured: Arbitrum Sepolia (chainId: 421614)
Configured: OP Sepolia (chainId: 11155420)

🚀 Multi-Network Faucet Relayer
📡 Server: http://localhost:8081
💼 Relayer Address: 0x...
```

---

## 📚 API Reference

### **GET /health**

Check relayer status and network configuration.

```bash
curl http://localhost:8081/health
```

**Response**

```json
{
  "status": "ok",
  "networks": [
    { "chainId": "11155111", "name": "Sepolia" },
    { "chainId": "421614", "name": "Arbitrum Sepolia" }
  ],
  "relayerAddress": "0x...",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### **GET /networks**

List all configured networks and claim statistics.

```bash
curl http://localhost:8081/networks
```

### **POST /can-claim**

Check if a user can currently claim on a given network.

```json
{
  "chainId": "11155111",
  "user": "0xB9f30B9772e5aa6819204071d94ecEfcc16f638d"
}
```

**Response (eligible)**

```json
{ "canClaim": true }
```

**Response (on cooldown)**

```json
{
  "canClaim": false,
  "remainingSeconds": 43200,
  "nextClaimTime": "2025-01-28T10:30:00Z"
}
```

### **POST /faucet**

Submit a signed claim for execution.

```json
{
  "user": "0xB9f30B9772e5aa6819204071d94ecEfcc16f638d",
  "nonce": "0",
  "deadline": "1760189785",
  "signature": "0x7d515beaee...",
  "chainId": "11155111"
}
```

**Response**

```json
{
  "success": true,
  "txHash": "0xabcdef...",
  "network": "Sepolia",
  "nextClaimTime": "2025-01-28T10:30:00Z"
}
```

---

## 🔐 Frontend Integration

> The frontend never sends private keys — it only signs structured claim data for verification by the relayer.

### Generate the Signature

- Below is an example using `viem` to generate the message hash and signature.

```javascript
import { encodePacked, keccak256 } from "viem";

const nonce = await contract.read.nonces([user]);
const deadline = Math.floor(Date.now() / 1000) + 300;

const hash = keccak256(
  encodePacked(
    ["address", "uint256", "uint256", "uint256", "address"],
    [user, BigInt(nonce), BigInt(deadline), BigInt(chainId), faucetAddress]
  )
);

const signature = await wallet.signMessage({ message: { raw: hash } });
```

### Claim Flow

1. Call `/can-claim`
2. Fetch user nonce from contract
3. Create and sign the message
4. Submit signed payload to `/faucet`
5. Display transaction status to user

---

## 🔧 Configuration

### Rate Limiting

Adjust limits in `src/config.js`:

```javascript
maxClaims: 20,             // per hour
windowMs: 60 * 60 * 1000   // 1 hour
```

### Adding a New Network

```javascript
const NETWORKS = {
  123456: {
    name: "Custom Testnet",
    chain: customChainObject, // viem chain object
    rpcUrl: process.env.CUSTOM_RPC_URL,
    faucetAddress: process.env.CUSTOM_FAUCET_ADDRESS,
  },
};
```

---

## 🧪 Testing

### API Tests

```bash
curl http://localhost:8081/health
curl http://localhost:8081/networks
curl -X POST http://localhost:8081/can-claim \
  -H "Content-Type: application/json" \
  -d '{"chainId":"11155111","user":"0xYourAddress"}'
```

### Contract Checks (using viem or ethers)

```javascript
const balance = await contract.read.getBalance();
const userInfo = await contract.read.getUserInfo([user]);
console.log(userInfo); // { nonce, lastClaim, nextClaim, canClaimNow }
```

---

## 🚀 Deployment

### Prerequisites

* Faucet contracts deployed on all supported testnets
* Relayer wallet funded with test ETH for gas
* Valid RPC endpoints configured
* `.env` file filled out completely

### Production Run

```bash
pnpm start
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE)
