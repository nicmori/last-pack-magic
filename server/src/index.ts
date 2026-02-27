import cron from "node-cron";
import { updatePrices } from "./fetcher";
import { analyzeWatchlistFloors } from "./math";

console.log("Starting up the Last Pack Magic tracking engine...");

// 1. Run an initial fetch immediately on startup
// This is incredibly helpful for local dev so you can test without waiting for the cron trigger
console.log("Executing initial startup fetch...");
updatePrices().then(() => {
  console.log("Initial fetch complete. Handing over to the scheduler.");
}).catch((err) => {
  console.error("Error during initial fetch:", err);
});

// 2. Schedule the recurring job
// The cron string "0 */4 * * *" means: "At minute 0 past every 4th hour"
cron.schedule("0 */4 * * *", async () => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] Executing scheduled price fetch...`);
  
  await updatePrices();
  await analyzeWatchlistFloors(); 
});

console.log("Cron scheduler initialized successfully.");
console.log("Waiting for the next scheduled run...");