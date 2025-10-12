import {
  clients,
  account,
  networkClaimTracker,
  userCooldowns,
} from "./config.js";

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

// Networks Info Handler
export function handleNetworks(req, res) {
  const networksInfo = {};

  Object.entries(clients).forEach(([chainId, client]) => {
    const tracker = networkClaimTracker[chainId];
    const now = Date.now();
    const recentClaims = tracker.claims.filter(
      (t) => now - t < tracker.windowMs
    ).length;

    networksInfo[chainId] = {
      name: client.name,
      faucetAddress: client.faucetAddress,
      claimsThisHour: recentClaims,
      remainingClaims: tracker.maxClaims - recentClaims,
    };
  });

  res.json({ networks: networksInfo });
}

// Can Claim Check Handler
export function handleCanClaim(req, res) {
  try {
    const { chainId, user } = req.body;

    if (!chainId || !clients[chainId])
      return res.status(400).json({
        error: `Chain ID '${chainId}' not supported`,
        availableChainIds: Object.keys(clients),
      });

    if (!user || !isAddress(user))
      return res.status(400).json({ error: "Invalid user address" });

    const lastRequest = userCooldowns[chainId].get(user.toLowerCase());
    const now = Date.now();

    if (lastRequest && now - lastRequest < 24 * 60 * 60 * 1000) {
      const remaining = Math.ceil(
        (24 * 60 * 60 * 1000 - (now - lastRequest)) / 1000
      );
      const nextClaimTime = new Date(lastRequest + 24 * 60 * 60 * 1000);

      return res.json({
        canClaim: false,
        remainingSeconds: remaining,
        nextClaimTime: nextClaimTime.toISOString(),
      });
    }

    res.json({ canClaim: true });
  } catch (err) {
    console.error("Can-claim check error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
}

function handleFaucet(req, res) {}

export { handleHealth, handleNetworks, handleCanClaim, handleFaucet };
