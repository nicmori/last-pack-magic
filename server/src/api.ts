import { Router } from "express";
import { prisma } from "./prisma";

const router = Router();

// GET /api/watchlist — full dashboard view
router.get("/watchlist", async (_req, res) => {
  try {
    const watchlist = await prisma.watchlist.findMany({
      include: {
        card: {
          include: {
            prices: {
              orderBy: { timestamp: "desc" },
              take: 20, // last 20 price points per card
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = watchlist.map((entry) => ({
      id: entry.id,
      cardId: entry.cardId,
      targetSnipePrice: entry.targetSnipePrice,
      isSettled: entry.isSettled,
      lastAlertSent: entry.lastAlertSent,
      createdAt: entry.createdAt,
      card: {
        name: entry.card.name,
        setName: entry.card.setName,
        cardNumber: entry.card.cardNumber,
        game: entry.card.game,
        tcgplayerId: entry.card.tcgplayerId,
      },
      priceHistory: entry.card.prices.map((p) => ({
        marketPrice: p.marketPrice,
        lowestListing: p.lowestListing,
        timestamp: p.timestamp,
      })),
      latestPrice: entry.card.prices[0] ?? null,
    }));

    res.json(data);
  } catch (error) {
    console.error("API error /watchlist:", error);
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// GET /api/stats — quick summary numbers
router.get("/stats", async (_req, res) => {
  try {
    const [totalCards, settledCount, totalPricePoints] = await Promise.all([
      prisma.watchlist.count(),
      prisma.watchlist.count({ where: { isSettled: true } }),
      prisma.priceHistory.count(),
    ]);

    res.json({
      totalCards,
      settledCount,
      activeCount: totalCards - settledCount,
      totalPricePoints,
    });
  } catch (error) {
    console.error("API error /stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
