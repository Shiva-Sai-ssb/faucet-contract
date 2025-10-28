# 🚰 Multi-Network Faucet (Client)

The frontend application for the Multi-Network Testnet Faucet system. Built with modern web technologies, it provides a seamless interface for users to claim testnet ETH across multiple networks without requiring initial gas fees.

## 🎯 Purpose

This client application serves as the user interface for the faucet system, enabling developers to:

- Claim testnet ETH without having initial funds
- Track cooldown periods between claims
- Switch between different test networks
- Monitor claim status and transaction progress

## ✨ Features

- **Wallet Integration:** Connect to the application using popular wallets like MetaMask or WalletConnect
- **Network Switching:** Easily switch between supported testnet networks
- **Claiming Interface:** A simple and intuitive interface for claiming testnet ETH
- **Cooldown Timer:** Displays the remaining time until the user can make their next claim
- **Responsive Design:** The application is designed to work on both desktop and mobile devices

---

## 🚀 Quick Start

### 1. Navigate to the client directory

```bash
cd faucet-contract/client
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Run the Development Server

```bash
pnpm dev
```

This will start the development server and open the application in your default browser.

---

## 🔧 Configuration

### Contract Addresses

The faucet contract addresses are pre-configured in `src/config/contract.ts`:

```typescript
export const CONTRACT_CONFIGS = {
  11155111: {
    // Sepolia
    address: "0x9417d9a8F617eB4892F1687f9F9675866D8e1b4B",
    name: "Sepolia Testnet",
  },
  421614: {
    // Arbitrum Sepolia
    address: "0x8A684de93e633A7d16E3922213d8AE20DfcC8BD4",
    name: "Arbitrum Sepolia",
  },
  11155420: {
    // Optimism Sepolia
    address: "0x8A684de93e633A7d16E3922213d8AE20DfcC8BD4",
    name: "Optimism Sepolia",
  },
};
```

### Environment Variables

Create a `.env` file in the client directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure the following environment variables:

```env
# API Configuration
VITE_API_URL=http://localhost:8081  # Backend API URL

# Networks Configuration (RPC URLs)
VITE_SEPOLIA_RPC_URL=              # Sepolia RPC URL from Alchemy/Infura
VITE_ARBITRUM_SEPOLIA_RPC_URL=     # Arbitrum Sepolia RPC URL
VITE_OPTIMISM_SEPOLIA_RPC_URL=     # Optimism Sepolia RPC URL

# WebSocket URLs (Optional - for real-time updates)
VITE_SEPOLIA_WS_URL=              # Sepolia WebSocket URL (optional)
VITE_ARBITRUM_SEPOLIA_WS_URL=     # Arbitrum Sepolia WebSocket URL (optional)
VITE_OPTIMISM_SEPOLIA_WS_URL=     # Optimism Sepolia WebSocket URL (optional)

# WalletConnect Configuration
VITE_WALLETCONNECT_PROJECT_ID=     # WalletConnect Project ID (optional)
```

> Note: You can obtain RPC URLs from providers like Alchemy or Infura. WebSocket URLs are optional but recommended for real-time updates.

---

## 🛠️ Technologies Used

- **React:** A JavaScript library for building user interfaces
- **Vite:** A fast build tool and development server for modern web projects
- **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript
- **Wagmi:** A collection of React Hooks for Ethereum
- **Tailwind CSS:** A utility-first CSS framework for rapid UI development

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.
