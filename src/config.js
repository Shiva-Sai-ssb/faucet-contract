import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
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

// Rate Limiting Configuration
export const networkClaimTracker = {};
Object.keys(NETWORKS).forEach((chainId) => {
  networkClaimTracker[chainId] = {
    claims: [],
    maxClaims: 20,
    windowMs: 60 * 60 * 1000,
  };
});

// Relayer Account
const RELAYER_PK = process.env.RELAYER_PRIVATE_KEY;
if (!RELAYER_PK) {
  console.error("Missing RELAYER_PRIVATE_KEY");
  process.exit(1);
}

const account = privateKeyToAccount(RELAYER_PK);

export { FAUCET_ABI, NETWORKS, networkClaimTracker, account };
