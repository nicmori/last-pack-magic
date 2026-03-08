/**
 * cleanup.ts
 *
 * Removes duplicate price points that were captured too close together in time.
 * This typically happens when the dev server is restarted back-to-back, triggering
 * multiple fetch cycles within seconds/minutes of each other.
 *
 * Strategy: for each card, walk through its price history (oldest → newest) and
 * delete any point that falls within MIN_GAP_MINUTES of the previous *kept* point.
 * The earliest point in each cluster is always kept.
 *
 * Usage:  npm run cleanup
 */

import { prisma } from "./prisma";

const MIN_GAP_MINUTES = 4 * 60; // matches cron interval (every 4 hours) — anything closer is a duplicate
const MIN_GAP_MS = MIN_GAP_MINUTES * 60 * 1_000;

async function main() {
  console.log(`🧹 Starting price history cleanup (min gap: ${MIN_GAP_MINUTES} min)...`);

  const cards = await prisma.card.findMany({ select: { id: true, name: true } });

  let totalDeleted = 0;

  for (const card of cards) {
    const history = await prisma.priceHistory.findMany({
      where: { cardId: card.id },
      orderBy: { timestamp: "asc" },
      select: { id: true, timestamp: true },
    });

    if (history.length === 0) continue;

    const toDelete: string[] = [];
    let lastKeptTime = history[0]!.timestamp.getTime();

    for (let i = 1; i < history.length; i++) {
      const pointTime = history[i]!.timestamp.getTime();
      if (pointTime - lastKeptTime < MIN_GAP_MS) {
        toDelete.push(history[i]!.id);
      } else {
        lastKeptTime = pointTime;
      }
    }

    if (toDelete.length > 0) {
      await prisma.priceHistory.deleteMany({ where: { id: { in: toDelete } } });
      console.log(`  ${card.name}: removed ${toDelete.length} point(s) (${history.length - toDelete.length} kept)`);
      totalDeleted += toDelete.length;
    }
  }

  console.log(`✅ Done. Total price points removed: ${totalDeleted}`);
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
