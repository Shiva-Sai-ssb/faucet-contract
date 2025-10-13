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
  canUserClaim,
  setUserCooldown,
  getUserCooldownInfo,
  checkAndAddNetworkClaim,
  rollbackNetworkClaim,
  networkClaimTracker,
} from "./config.js";

// Root Page Handler
function handleHome(req, res) {
  res.send(`
    <div style="
      font-family: sans-serif;
      text-align: center;
      padding: 3rem;
      color: #222;
    ">
      <h1>🌊 Multi-Network Faucet Backend</h1>
      <p>Server is up and running on port <b>${8081}</b></p>
      <hr style="margin: 2rem auto; width: 50%;">
      <p>
        Available endpoints:
      </p>
      <ul style="list-style:none; padding:0;">
        <li><code>GET /health</code> – Server & network status</li>
        <li><code>GET /networks</code> – Faucet stats by network</li>
        <li><code>POST /can-claim</code> – Check if user can claim</li>
        <li><code>POST /faucet</code> – Request a drip</li>
      </ul>
      <p style="margin-top:2rem; font-size:0.9rem; color:#555;">
        Relayer address: <code>${account.address}</code>
      </p>
    </div>
  `);
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

    // Check if user can claim (with lazy cleanup)
    if (!canUserClaim(chainId, user)) {
      const cooldownInfo = getUserCooldownInfo(chainId, user);
      return res.json({
        canClaim: false,
        remainingSeconds: cooldownInfo.remainingSeconds,
        nextClaimTime: new Date(cooldownInfo.expiresAt).toISOString(),
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
    const rateLimitCheck = checkAndAddNetworkClaim(chainId);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: "Network rate limit reached",
        resetTime: rateLimitCheck.resetTime.toISOString(),
        remaining: rateLimitCheck.remaining,
      });
    }

    // User Cooldown Check
    if (!canUserClaim(chainId, user)) {
      const cooldownInfo = getUserCooldownInfo(chainId, user);
      rollbackNetworkClaim(chainId);
      return res.status(429).json({
        error: "Cooldown active",
        remainingSeconds: cooldownInfo.remainingSeconds,
        nextClaimTime: new Date(cooldownInfo.expiresAt).toISOString(),
      });
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
      rollbackNetworkClaim(chainId);
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
      rollbackNetworkClaim(chainId);
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
      rollbackNetworkClaim(chainId);

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
      rollbackNetworkClaim(chainId);

      return res.status(500).json({
        error: "Transaction failed",
        details: err.message || String(err),
      });
    }

    // Update user cooldown (only after successful transaction)
    const now = Date.now();
    setUserCooldown(chainId, user, now);

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
    console.error("Relayer error:", err);
    res.status(500).json({
      error: "Internal server error",
      details: err.message || String(err),
    });
  }
}

export {
  handleHome,
  handleHealth,
  handleNetworks,
  handleCanClaim,
  handleFaucet,
};
