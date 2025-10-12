import {
  encodePacked,
  encodeFunctionData,
  isAddress,
  keccak256,
  recoverMessageAddress,
} from "viem";
import {
  FAUCET_ABI,
  clients,
  account,
  userCooldowns,
  networkClaimTracker,
} from "./config.js";

// Network Rate Limit Check Helper Function
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

    // Deadline Validation
    const deadlineTimestamp = BigInt(deadline);
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));

    if (currentTimestamp > deadlineTimestamp)
      return res
        .status(400)
        .json({ error: "Sorry, the deadline has expired. Please try again." });

    // Network Rate Limit Check
    const rateLimitCheck = checkNetworkRateLimit(chainId);

    if (!rateLimitCheck.allowed)
      return res.status(429).json({
        error: "Network rate limit reached",
        resetTime: rateLimitCheck.resetTime.toISOString(),
        remaining: rateLimitCheck.remaining,
      });

    // User Cooldown Check
    const lastRequest = userCooldowns[chainId].get(user.toLowerCase());
    const now = Date.now();
    if (lastRequest && now - lastRequest < 24 * 60 * 60 * 1000) {
      networkClaimTracker[chainId].claims.pop();
      const remaining = Math.ceil(
        (24 * 60 * 60 * 1000 - (now - lastRequest)) / 1000
      );
      return res
        .status(429)
        .json({ error: `Cooldown active`, remainingSeconds: remaining });
    }

    const { publicClient, walletClient, faucetAddress, name } =
      clients[chainId];

    console.log("Faucet Address:", faucetAddress);

    // Signature Verification
    const hash = keccak256(
      encodePacked(
        ["address", "uint256", "uint256", "uint256", "address"],
        [user, BigInt(nonce), BigInt(deadline), BigInt(chainId), faucetAddress]
      )
    );

    console.log("Computed Hash:", hash);
    console.log("Received Signature:", signature);

    let recovered;
    try {
      recovered = await recoverMessageAddress({
        message: { raw: hash },
        signature,
      });
    } catch (err) {
      console.error("Signature recovery error:", err);
      return res.status(400).json({
        error: "Invalid signature format",
        details: err.message,
      });
    }

    console.log("Recovered Address:", recovered);
    console.log("Expected Address:", user);
    console.log("Match:", recovered.toLowerCase() === user.toLowerCase());

    if (recovered.toLowerCase() !== user.toLowerCase()) {
      return res.status(400).json({ error: "Invalid signature" });
    }

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

    // Update user cooldown
    userCooldowns[chainId].set(user.toLowerCase(), now);

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
