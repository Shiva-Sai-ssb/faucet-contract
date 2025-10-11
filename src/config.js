import "dotenv/config";
import { sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";

// Faucet ABI
const FAUCET_ABI = [];

// Network Configuration
const NETWORKS = {
  11155111: {
    name: "Sepolia",
    chain: sepolia,
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    faucetAddress: process.env.SEPOLIA_FAUCET_ADDRESS,
  },
  421614: {
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL,
    faucetAddress: process.env.ARBITRUM_SEPOLIA_FAUCET_ADDRESS,
  },
  11155420: {
    name: "OP Sepolia",
    chain: optimismSepolia,
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL,
    faucetAddress: process.env.OPTIMISM_SEPOLIA_FAUCET_ADDRESS,
  },
};

export { FAUCET_ABI, NETWORKS };
