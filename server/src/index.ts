import cron from "node-cron";
import express from "express";
import cors from "cors";
import { updatePrices } from "./fetcher";
import { analyzeWatchlistFloors } from "./math";
import apiRouter from "./api";

// ── Express API Server ──
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

// ── Cron Engine ──
console.log("Starting up the Last Pack Magic tracking engine...");

// 1. Run an initial fetch immediately on startup
console.log("Executing initial startup fetch...");
updatePrices().then(() => {
  console.log("Initial fetch complete. Handing over to the scheduler.");
}).catch((err) => {
  console.error("Error during initial fetch:", err);
});

// 2. Schedule the recurring job
cron.schedule("0 */4 * * *", async () => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] Executing scheduled price fetch...`);
  
  await updatePrices();
  await analyzeWatchlistFloors(); 
});

console.log("Cron scheduler initialized successfully.");
console.log("Waiting for the next scheduled run...");