import "dotenv/config";
import express, { json } from "express";
import cors from "cors";

const app = express();
app.use(json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:8080" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
