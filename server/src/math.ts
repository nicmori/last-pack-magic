import { prisma } from "./prisma";
import { sendFloorAlert } from "./alert";

// --- Floor Detection Configuration ---
const CV_THRESHOLD = 0.03;            // Coefficient of variation must be ≤ 3%
const SLOPE_THRESHOLD_PERCENT = 0.01; // Normalized slope must be ≤ 1% of the mean per data point
const MIN_DATA_POINTS = 5;            // Minimum recent points needed to evaluate
const MIN_DISTINCT_DAYS = 3;          // Data must span at least 3 different calendar days
const DAYS_TO_LOOK_BACK = 7;

export async function analyzeWatchlistFloors() {
  console.log("Analyzing price data to find settled floors...");

  try {
    // 1. Only analyze cards that haven't settled yet
    const activeWatchlist = await prisma.watchlist.findMany({
      where: { isSettled: false },
      include: { card: true }
    });

    if (activeWatchlist.length === 0) {
      console.log("All tracked cards have already settled. Nothing to analyze.");
      return;
    }

    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - DAYS_TO_LOOK_BACK);

    for (const item of activeWatchlist) {
      // 2. Fetch the last 7 days of price history for this specific card
      const history = await prisma.priceHistory.findMany({
        where: {
          cardId: item.cardId,
          timestamp: { gte: lookbackDate },
        },
        orderBy: { timestamp: "asc" },
      });

      if (history.length < MIN_DATA_POINTS) {
        continue;
      }

      // 3. Extract prices and timestamps
      const prices = history.map((h) => h.lowestListing);
      const timestamps = history.map((h) => h.timestamp);

      // 4. Sliding window — check if any recent window of MIN_DATA_POINTS is settled
      //    This lets us detect stabilization as soon as it happens, even if
      //    earlier data in the lookback period was volatile.
      const isFloorFound = detectFloorInWindow(prices, timestamps);

      if (isFloorFound) {
        console.log(`📉 FLOOR FOUND! [${item.card.cardNumber}] ${item.card.name} has stabilized.`);

        // 5. Mark as settled
        await prisma.watchlist.update({
          where: { id: item.id },
          data: { isSettled: true },
        });

        // 6. Trigger Discord alert
        const currentFloorPrice = prices[prices.length - 1]!;
        await sendFloorAlert(item.card, currentFloorPrice);
      }
    }
  } catch (error) {
    console.error("Error analyzing floors:", error);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Slides a window of MIN_DATA_POINTS across the price array (most recent first)
 * and returns true as soon as any window passes both the CV and slope checks.
 */
function detectFloorInWindow(prices: number[], timestamps: Date[]): boolean {
  // Start from the tail (most recent) and work backwards
  for (let end = prices.length; end >= MIN_DATA_POINTS; end--) {
    const windowPrices = prices.slice(end - MIN_DATA_POINTS, end);
    const windowTimestamps = timestamps.slice(end - MIN_DATA_POINTS, end);

    // Require data spanning at least MIN_DISTINCT_DAYS different calendar days
    const distinctDays = new Set(
      windowTimestamps.map((t) => t.toISOString().slice(0, 10))
    );
    if (distinctDays.size < MIN_DISTINCT_DAYS) continue;

    if (calculateIfSettled(windowPrices)) {
      return true;
    }
  }
  return false;
}

/**
 * Determines if a set of prices represents a settled floor using two signals:
 *
 * 1. Coefficient of Variation (CV) — stdev / mean.
 *    Unlike range-based checks, a single outlier doesn't dominate.
 *    CV ≤ 3% means prices are tightly clustered.
 *
 * 2. Linear regression slope — measures the trend direction.
 *    A slope near zero (normalized by the mean) means prices have flattened,
 *    not still declining. This catches "leveling off" that pure variance misses.
 *
 * Both conditions must be true = high-confidence floor detection.
 */
function calculateIfSettled(prices: number[]): boolean {
  const n = prices.length;
  const mean = prices.reduce((sum, p) => sum + p, 0) / n;

  if (mean === 0) return false; // Avoid division by zero

  // --- Signal 1: Coefficient of Variation ---
  const squaredDiffs = prices.map((p) => (p - mean) ** 2);
  const stdev = Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / n);
  const cv = stdev / mean;

  // --- Signal 2: Linear Regression Slope ---
  // Using indices 0..n-1 as x values (evenly spaced time steps)
  const xMean = (n - 1) / 2;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (prices[i]! - mean);
    denominator += (i - xMean) ** 2;
  }
  const slope = numerator / denominator;

  // Normalize the slope relative to the mean price so the threshold
  // works regardless of whether the card is $5 or $500.
  const normalizedSlope = Math.abs(slope) / mean;

  return cv <= CV_THRESHOLD && normalizedSlope <= SLOPE_THRESHOLD_PERCENT;
}