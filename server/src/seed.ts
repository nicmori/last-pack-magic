import { prisma } from "./prisma";

async function main() {
  console.log("🌱 Seeding database with initial watchlist...");

  // 1. Define your initial cards
  const cardsToSeed = [
    // {
    //   tcgplayerId: 272421, // Palkia V (Alternate Full Art)
    //   name: "Origin Forme Palkia V (Alternate Full Art)",
    //   setName: "Astral Radiance",
    //   cardNumber: "167/189",
    //   game: "Pokemon",
    // },
    {
      tcgplayerId: 664937, 
      name: "Vayne - Hunter (Overnumbered)",
      setName: "Riftbound", // Base / Promo
      cardNumber: "N/A",
      game: "Riftbound",
    },
    {
      tcgplayerId: 666784, 
      name: "Soraka - Wanderer (Overnumbered)",
      setName: "Riftbound", 
      cardNumber: "N/A",
      game: "Riftbound",
    },
    {
      tcgplayerId: 668214, 
      name: "Bard - Mercurial (Overnumbered)",
      setName: "Riftbound", 
      cardNumber: "N/A",
      game: "Riftbound",
    },
    {
      tcgplayerId: 653101, 
      name: "Ahri - Nine-Tailed Fox (Overnumbered)",
      setName: "Origins",
      cardNumber: "N/A",
      game: "Riftbound",
    },
    {
      tcgplayerId: 664881, 
      name: "Ahri - Inquisitive (Overnumbered)",
      setName: "Spiritforged",
      cardNumber: "N/A",
      game: "Riftbound",
    }
  ];

  for (const cardData of cardsToSeed) {
    // 2. Upsert prevents crashing if you run the seed script twice
    const card = await prisma.card.upsert({
      where: { tcgplayerId: cardData.tcgplayerId },
      update: {}, 
      create: cardData,
    });

    // 3. Add it to the Watchlist if it isn't there already
    await prisma.watchlist.upsert({
      where: { cardId: card.id },
      update: {}, 
      create: {
        cardId: card.id,
        isSettled: false,
        targetSnipePrice: null, 
      },
    });

    console.log(`✅ Added ${card.name} to the database and watchlist.`);
  }

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });