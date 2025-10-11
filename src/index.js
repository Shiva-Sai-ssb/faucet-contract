import express, { json } from "express";
import cors from "cors";
import {
  handleHealth,
  handleNetworks,
  handleCanClaim,
  handleFaucet,
} from "./faucet.js";

const app = express();

// Middlewares
app.use(json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:8080" }));

// Routes
app.get("/health", handleHealth);
app.get("/networks", handleNetworks);
app.post("/can-claim", handleCanClaim);
app.post("/faucet", handleFaucet);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
