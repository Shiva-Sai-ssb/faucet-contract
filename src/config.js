import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";

// Minimal Faucet ABI
const FAUCET_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "nonce",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "drip",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

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

// User cooldown store (24 hours)
const userCooldowns = {};
Object.keys(clients).forEach((chainId) => {
  userCooldowns[chainId] = new Map();
});

// User cooldown helper functions
function setUserCooldown(chainId, user, now = Date.now()) {
  userCooldowns[chainId].set(user.toLowerCase(), {
    lastClaim: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
  });
}

function canUserClaim(chainId, user, now = Date.now()) {
  const entry = userCooldowns[chainId].get(user.toLowerCase());
  if (!entry) return true;

  if (now >= entry.expiresAt) {
    userCooldowns[chainId].delete(user.toLowerCase());
    return true;
  }

  return false;
}

function getUserCooldownInfo(chainId, user) {
  const entry = userCooldowns[chainId].get(user.toLowerCase());
  if (!entry) return null;

  const now = Date.now();
  if (now >= entry.expiresAt) {
    userCooldowns[chainId].delete(user.toLowerCase());
    return null;
  }

  return {
    lastClaim: entry.lastClaim,
    expiresAt: entry.expiresAt,
    remainingSeconds: Math.ceil((entry.expiresAt - now) / 1000),
  };
}

// Network rate limit helper
function checkAndAddNetworkClaim(chainId) {
  const tracker = networkClaimTracker[chainId];
  const now = Date.now();

  while (tracker.claims.length && now - tracker.claims[0] >= tracker.windowMs) {
    tracker.claims.shift();
  }

  const allowed = tracker.claims.length < tracker.maxClaims;

  if (allowed) {
    tracker.claims.push(now);
    return {
      allowed: true,
      remaining: tracker.maxClaims - tracker.claims.length,
      resetTime: null,
    };
  } else {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(tracker.claims[0] + tracker.windowMs),
    };
  }
}

function rollbackNetworkClaim(chainId) {
  const tracker = networkClaimTracker[chainId];
  if (tracker.claims.length > 0) {
    tracker.claims.pop();
  }
}

export {
  FAUCET_ABI,
  NETWORKS,
  networkClaimTracker,
  account,
  clients,
  setUserCooldown,
  canUserClaim,
  getUserCooldownInfo,
  checkAndAddNetworkClaim,
  rollbackNetworkClaim,
};
