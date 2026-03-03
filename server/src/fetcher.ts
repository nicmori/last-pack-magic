import { prisma } from "./prisma";
import "dotenv/config";
const API_KEY = process.env.JUSTTCG_API_KEY;

export async function updatePrices() {
  console.log("Starting JustTCG price fetch cycle...");

  if (!API_KEY) {
    console.error("Error: JUSTTCG_API_KEY is missing from your .env file.");
    return;
  }

  try {
    // 1. Get all unique TCGplayer IDs currently on the Watchlist
    const watchlist = await prisma.watchlist.findMany({
      include: { card: true },
    });

    if (watchlist.length === 0) {
      console.log("Watchlist is empty. Skipping fetch.");
      return;
    }

    const newPriceRecords = [];

    // 2. Fetch prices from JustTCG
    // Note: The Free tier allows 100 requests/day. For an MVP, iterating is fine. 
    // If your watchlist grows, JustTCG offers a bulk POST endpoint to fetch 100 at a time.
    for (const entry of watchlist) {
      const tcgId = entry.card.tcgplayerId;
      
      const response = await fetch(`https://api.justtcg.com/v1/cards?tcgplayerId=${tcgId}`, {
        method: "GET",
        headers: {
          "x-api-key": API_KEY,
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch data for ID ${tcgId}: ${response.statusText}`);
        continue;
      }

      const responseData = await response.json();
      
      // JustTCG returns an array of matching cards, each containing a 'variants' array
      const cards = responseData.data || [];
      
      if (cards.length > 0) {
        const cardData = cards[0];
        
        // 3. Filter for specific conditions (e.g., Near Mint) and printings
        const targetVariants = cardData.variants?.filter((v: any) => 
          v.condition === "NM" && 
          (v.printing === "Normal" || v.printing === "Holofoil")
        ) || [];

        if (targetVariants.length > 0) {
          // Find the lowest price among the matching NM variants
          const lowestPrice = Math.min(...targetVariants.map((v: any) => v.price));
          
          newPriceRecords.push({
            cardId: entry.cardId,
            marketPrice: lowestPrice, // JustTCG provides highly accurate market sell prices
            lowestListing: lowestPrice, 
          });
        }
      }
      
      // A small delay to be a good citizen on the API and avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200)); 
    }

    // 4. Bulk insert the new prices into your SQLite database
    if (newPriceRecords.length > 0) {
      await prisma.priceHistory.createMany({
        data: newPriceRecords,
      });
      console.log(`Successfully saved ${newPriceRecords.length} new price data points.`);
    } else {
      console.log("No matching variant prices found to save.");
    }

  } catch (error) {
    console.error("Error during price fetch cycle:", error);
  } finally {
    await prisma.$disconnect();
  }
}