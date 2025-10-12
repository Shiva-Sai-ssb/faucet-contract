import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http } from "viem";
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
const networkClaimTracker = {};
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

// Initialize clients per network
const clients = {};
Object.entries(NETWORKS).forEach(([chainId, config]) => {
  if (config.rpcUrl && config.faucetAddress) {
    clients[chainId] = {
      publicClient: createPublicClient({
        chain: config.chain,
        transport: http(config.rpcUrl),
      }),
      walletClient: createWalletClient({
        account,
        chain: config.chain,
        transport: http(config.rpcUrl),
      }),
      faucetAddress: config.faucetAddress,
      name: config.name,
    };
    console.log(`Configured: ${config.name} (chainId: ${chainId})`);
  }
});

if (!Object.keys(clients).length) {
  console.error(
    "No networks configured. Please set RPC_URL and FAUCET_ADDRESS for at least one network."
  );
  process.exit(1);
}

export { FAUCET_ABI, NETWORKS, networkClaimTracker, account, clients };
