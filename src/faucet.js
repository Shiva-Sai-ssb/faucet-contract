import { clients, account } from "./config.js";

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
