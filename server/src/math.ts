import { prisma } from "./prisma";
import { sendFloorAlert } from "./alert";

// Configuration for what we consider a "Settled Floor"
const SETTLE_THRESHOLD_PERCENT = 0.05; // 5% variance max
const MIN_DATA_POINTS = 5;             // Need at least 5 price checks to confirm a floor
const DAYS_TO_LOOK_BACK = 7;

export async function analyzeWatchlistFloors() {
  console.log("Analyzing price data to find settled floors...");

  try {
    // 1. Only analyze cards that haven't settled yet
    const activeWatchlist = await prisma.watchlist.findMany({
      where: { isSettled: false },
      include: { card: true } // Bring in card details for logging/alerts
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
        // Not enough data points gathered yet, skip to the next card
        continue;
      }

      // 3. Extract just the prices
      const prices = history.map((h) => h.lowestListing);

      // 4. Run the math
      const isFloorFound = calculateIfSettled(prices);

      if (isFloorFound) {
        console.log(`📉 FLOOR FOUND! [${item.card.cardNumber}] ${item.card.name} has stabilized.`);
        
        // 5. Update the database to mark it as settled
        await prisma.watchlist.update({
          where: { id: item.id },
          data: { isSettled: true },
        });

        // 6. Trigger the Discord alert here --needs tested
        const currentFloorPrice = prices[prices.length - 1]; // Grab the most recent price
        await sendFloorAlert(item.card, currentFloorPrice);
      }
    }
  } catch (error) {
    console.error("Error analyzing floors:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Pure math function separated out so it's easy to unit test later
function calculateIfSettled(prices: number[]): boolean {
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;

  // Calculate the spread between the absolute highest and lowest price in the window.
  // If that spread is less than or equal to 5% of the average price, it's considered flat.
  const variance = (maxPrice - minPrice) / average;

  return variance <= SETTLE_THRESHOLD_PERCENT;
}