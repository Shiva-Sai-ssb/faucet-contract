import express, { json } from "express";
import cors from "cors";
import { clients, account } from "./config.js";
import {
  handleHome,
  handleHealth,
  handleNetworks,
  handleCanClaim,
  handleFaucet,
  handleDebug,
} from "./faucet.js";

const app = express();
const PORT = 8081;

// Middlewares
app.use(json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// Routes
app.get("/", handleHome);
app.get("/health", handleHealth);
app.get("/networks", handleNetworks);
app.post("/can-claim", handleCanClaim);
app.post("/faucet", handleFaucet);

// Debug route - Only in dev
if (process.env.NODE_ENV !== "production") {
  app.get("/debug", handleDebug);
  console.log("⚠️  Debug endpoint enabled at GET /debug");
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Multi-Network Faucet listening on port ${PORT}`);
  console.log(`Configured networks:`);
  Object.entries(clients).forEach(([chainId, client]) => {
    console.log(`   - ${client.name} (chainId: ${chainId})`);
  });
  console.log(`\nRelayer address: ${account.address}`);
});
