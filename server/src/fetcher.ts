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

        // 2b. Sync card metadata (set, game) from JustTCG if available
        const updateData: Record<string, string> = {};
        if (cardData.set_name && cardData.set_name !== entry.card.setName) {
          updateData.setName = cardData.set_name;
        }
        if (cardData.game && cardData.game !== entry.card.game) {
          updateData.game = cardData.game;
        }
        if (cardData.number && cardData.number !== entry.card.cardNumber) {
          updateData.cardNumber = cardData.number;
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.card.update({
            where: { id: entry.card.id },
            data: updateData,
          });
          console.log(`  [metadata sync] ${entry.card.name}: updated ${Object.keys(updateData).join(", ")}`);
        }

        const allVariants: any[] = cardData.variants || [];
        
        // 3. Filter for English language variants only
        const englishVariants = allVariants.filter((v: any) => v.language === "English");

        // Prefer Near Mint, but fall back to any English variant if none are NM
        const nmVariants = englishVariants.filter((v: any) => v.condition === "Near Mint");
        const targetVariants = nmVariants.length > 0 ? nmVariants : englishVariants;

        if (targetVariants.length > 0) {
          // Find the lowest listed price among matching variants
          const lowestPrice = Math.min(...targetVariants.map((v: any) => v.price));

          // Use the NM average price as market price when available, otherwise same as lowest
          const nmAvg = nmVariants.length > 0
            ? nmVariants.reduce((sum: number, v: any) => sum + v.price, 0) / nmVariants.length
            : lowestPrice;
          
          newPriceRecords.push({
            cardId: entry.cardId,
            marketPrice: parseFloat(nmAvg.toFixed(2)),
            lowestListing: lowestPrice,
          });

          console.log(`  ${cardData.name}: lowest=$${lowestPrice} (${targetVariants.length} English variants)`);
        } else {
          console.log(`  ${cardData.name}: no English variants found`);
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