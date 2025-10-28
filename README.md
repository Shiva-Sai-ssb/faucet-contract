# 🚰 Multi-Network Testnet Faucet

A full-stack decentralized application (dApp) that provides a gasless testnet ETH distribution system across multiple networks. Users can claim testnet ETH without having any initial gas fees, making it easier for developers to start building on various test networks.

## 🌐 Live Demo

- **Frontend**: [https://faucet-contract.vercel.app/](https://faucet-contract.vercel.app/)
- **Backend**: [https://faucet-contract-server.onrender.com/](https://faucet-contract-server.onrender.com/)

## 📚 Project Overview

This project consists of three main components:

1. **Smart Contract** (`/server/contracts`)

   - Manages faucet funds and claim logic
   - Implements cooldown periods and claim limits

2. **Frontend** (`/client`)

   - React-based web interface
   - Wallet integration and network switching
   - User-friendly claim interface
   - [More details](./client/README.md)

3. **Backend Relayer** (`/server`)
   - Handles gasless transactions
   - Verifies signatures
   - Manages rate limiting
   - [More details](./server/README.md)

---

## ✨ Features

- **Gasless Transactions:** Users can claim testnet ETH without needing gas. The backend relayer covers the transaction fees.
- **Multi-Network Support:** The faucet is designed to work seamlessly across multiple testnet environments.
- **Secure Claims:** Claims are verified using ECDSA signatures, ensuring that only the legitimate owner of an address can claim funds.
- **On-Chain Cooldown:** The smart contract enforces a cooldown period between claims to prevent abuse.
- **User-Friendly Interface:** A modern and intuitive frontend built with React and TypeScript provides a smooth user experience.

---

## 🏗️ Architecture

The project is divided into three main components:

| Component             | Description                                                                                                         |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Frontend (Client)** | A React application that allows users to connect their wallets, sign messages, and claim testnet ETH.               |
| **Backend (Server)**  | A Node.js relayer that verifies user signatures, manages rate limiting, and submits transactions to the blockchain. |
| **Smart Contract**    | A Solidity contract deployed on the testnet that holds the faucet funds and enforces the rules of the faucet.       |

---

## 🚀 Quick Start

To get started with this project, you will need to set up the client, server, and deploy the smart contract.

### 1. Clone & Install

```bash
git clone https://github.com/Shiva-Sai-ssb/faucet-contract.git
cd faucet-contract
```

### 2. Setup

- **Client:** For instructions on how to set up and run the frontend, see the [client README](./client/README.md).
- **Server:** For instructions on how to set up the backend relayer and deploy the smart contract, see the [server README](./server/README.md).

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
