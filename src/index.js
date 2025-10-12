import express, { json } from "express";
import cors from "cors";
import { clients, account } from "./config.js";
import {
  handleHealth,
  handleNetworks,
  handleCanClaim,
  handleFaucet,
} from "./faucet.js";

const app = express();
const PORT = 8081;

// Middleware
app.use(json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Routes
app.get("/health", handleHealth);
app.get("/networks", handleNetworks);
app.post("/can-claim", handleCanClaim);
app.post("/faucet", handleFaucet);

// Start Server
app.listen(PORT, () => {
  console.log(`Multi-Network Faucet listening on port ${PORT}`);
  console.log(`Configured networks:`);
  Object.entries(clients).forEach(([chainId, client]) => {
    console.log(`   - ${client.name} (chainId: ${chainId})`);
  });
  console.log(`\nRelayer address: ${account.address}`);
});
