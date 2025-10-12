import { encodeFunctionData, isAddress } from "viem";
import {
  FAUCET_ABI,
  clients,
  account,
  userCooldowns,
  networkClaimTracker,
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
function handleNetworks(req, res) {
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
function handleCanClaim(req, res) {
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

// Main Faucet Handler
async function handleFaucet(req, res) {
  try {
    const { user, nonce, deadline, signature, chainId } = req.body;

    console.log("User:", user);
    console.log("Nonce:", nonce);
    console.log("Deadline:", deadline);
    console.log("Signature: ", signature);
    console.log("ChainId:", chainId);

    // Validation
    if (!chainId || !clients[chainId])
      return res
        .status(400)
        .json({ error: `Chain ID '${chainId}' not supported` });

    if (!user || nonce === undefined || !deadline)
      return res.status(400).json({
        error: "Missing parameters: user, nonce, deadline or signature",
      });

    if (!isAddress(user))
      return res.status(400).json({ error: "Invalid user address" });

    const { publicClient, walletClient, faucetAddress, name } =
      clients[chainId];

    console.log("Faucet Address:", faucetAddress);

    // Encode Transaction Data
    const data = encodeFunctionData({
      abi: FAUCET_ABI,
      functionName: "drip",
      args: [user, BigInt(nonce), BigInt(deadline), signature],
    });

    console.log("Encoded Data: ", data);

    // Gas Estimation
    let gas;
    try {
      const estimatedGas = await publicClient.estimateGas({
        account: account.address,
        to: faucetAddress,
        data,
      });

      gas = BigInt(Math.floor(Number(estimatedGas) * 1.2));
    } catch (err) {
      networkClaimTracker[chainId].claims.pop();

      return res.status(400).json({
        error: "Transaction would fail",
        details: err.message || String(err),
      });
    }

    console.log("Estimated Gas: ", gas);

    // Send Transaction
    let txHash;
    try {
      txHash = await walletClient.sendTransaction({
        to: faucetAddress,
        data,
        gas,
      });
    } catch (err) {
      networkClaimTracker[chainId].claims.pop();

      return res.status(500).json({
        error: "Transaction failed",
        details: err.message || String(err),
      });
    }

    console.log(
      `Drip Successful!\nNetwork: ${name} (Chain ID: ${chainId})\nRecipient: ${user}\nTransaction Hash: ${txHash}`
    );

    res.json({
      success: true,
      txHash,
      chainId,
      network: name,
      faucetAddress,
      user,
      nextClaimTime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      networkRateLimitRemaining: rateLimitCheck.remaining,
    });
  } catch (err) {
    console.log("Error: ", err);
  }
}

export { handleHealth, handleNetworks, handleCanClaim, handleFaucet };
