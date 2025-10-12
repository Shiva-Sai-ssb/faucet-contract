import { clients, account, networkClaimTracker } from "./config.js";

// Rate Limiting Check
function checkNetworkRateLimit(chainId) {
  const tracker = networkClaimTracker[chainId];
  const now = Date.now();
  tracker.claims = tracker.claims.filter((ts) => now - ts < tracker.windowMs);

  if (tracker.claims.length >= tracker.maxClaims) {
    const oldestClaim = Math.min(...tracker.claims);
    return {
      allowed: false,
      resetTime: new Date(oldestClaim + tracker.windowMs),
      remaining: 0,
    };
  }

  tracker.claims.push(now);
  return {
    allowed: true,
    remaining: tracker.maxClaims - tracker.claims.length,
  };
}

// Health Check Handler
function handleHealth(req, res) {
  res.json({
    status: "ok",
    networks: Object.keys(clients).map((id) => ({
      chainId: id,
      name: clients[id].name,
    })),
    relayerAddress: account.address,
    timestamp: new Date().toISOString(),
  });
}

function handleNetworks(req, res) {}

function handleCanClaim(req, res) {}

function handleFaucet(req, res) {}

export { handleHealth, handleNetworks, handleCanClaim, handleFaucet };
