import "dotenv/config";
import { Redis } from "@upstash/redis";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, http } from "viem";
import { sepolia, arbitrumSepolia, optimismSepolia } from "viem/chains";

// Redis Setup
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Minimal Faucet ABI
const FAUCET_ABI = [
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "nonce", type: "uint256" },
      { internalType: "uint256", name: "deadline", type: "uint256" },
      { internalType: "bytes", name: "signature", type: "bytes" },
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

// Cooldown Time
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

async function setUserCooldown(chainId, user, now = Date.now()) {
  const key = `cooldown:${chainId}:${user.toLowerCase()}`;
  const expiresAt = now + COOLDOWN_MS;
  await redis.set(key, JSON.stringify({ lastClaim: now, expiresAt }), {
    px: COOLDOWN_MS,
  });
}

async function canUserClaim(chainId, user, now = Date.now()) {
  const key = `cooldown:${chainId}:${user.toLowerCase()}`;
  const entry = await redis.get(key);

  if (!entry) return true;

  const data = typeof entry === "string" ? JSON.parse(entry) : entry;
  if (now >= data.expiresAt) {
    await redis.del(key);
    return true;
  }
  return false;
}

async function getUserCooldownInfo(chainId, user) {
  const key = `cooldown:${chainId}:${user.toLowerCase()}`;
  const entry = await redis.get(key);

  if (!entry) return null;

  const data = typeof entry === "string" ? JSON.parse(entry) : entry;
  const now = Date.now();

  if (now >= data.expiresAt) {
    await redis.del(key);
    return null;
  }

  return {
    lastClaim: data.lastClaim,
    expiresAt: data.expiresAt,
    remainingSeconds: Math.ceil((data.expiresAt - now) / 1000),
  };
}

// Network Rate Limit helper (20 claims/hour)
const MAX_CLAIMS = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

async function checkAndAddNetworkClaim(chainId) {
  const key = `network:claims:${chainId}`;
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let timestamps = await redis.lrange(key, 0, -1);
  timestamps = timestamps.map((t) => Number(t));
  const recentClaims = timestamps.filter((t) => t > cutoff);

  // Check if rate limit is exceeded BEFORE adding
  if (recentClaims.length >= MAX_CLAIMS) {
    const oldestInWindow = Math.min(...recentClaims);
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(oldestInWindow + WINDOW_MS),
    };
  }

  // Rate limit OK - add the new claim
  await redis.lpush(key, now);
  await redis.expire(key, Math.ceil(WINDOW_MS / 1000));

  return {
    allowed: true,
    remaining: MAX_CLAIMS - recentClaims.length - 1,
    resetTime: null,
  };
}

async function rollbackNetworkClaim(chainId) {
  const key = `network:claims:${chainId}`;
  await redis.lpop(key);
}

async function getNetworkRateLimitStatus(chainId) {
  const key = `network:claims:${chainId}`;
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  let timestamps = await redis.lrange(key, 0, -1);
  timestamps = timestamps.map((t) => Number(t));

  const recentClaims = timestamps.filter((t) => t > cutoff);
  const remaining = Math.max(0, MAX_CLAIMS - recentClaims.length);

  let resetTime;
  if (recentClaims.length > 0) {
    const oldestInWindow = Math.min(...recentClaims);
    resetTime = new Date(oldestInWindow + WINDOW_MS);
  } else {
    resetTime = new Date(now + WINDOW_MS);
  }

  return {
    remaining,
    resetTime,
  };
}

export {
  redis,
  account,
  clients,
  FAUCET_ABI,
  setUserCooldown,
  canUserClaim,
  getUserCooldownInfo,
  checkAndAddNetworkClaim,
  rollbackNetworkClaim,
  getNetworkRateLimitStatus,
};
