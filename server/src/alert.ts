import "dotenv/config";

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

export async function sendFloorAlert(card: any, currentPrice: number) {
  if (!WEBHOOK_URL) {
    console.warn("⚠️ No DISCORD_WEBHOOK_URL found in .env. Skipping alert.");
    return;
  }

  // Format a clean Discord Embed
  const embed = {
    title: "🚨 Price Floor Reached!",
    description: `**${card.name}** has mathematically settled and hit its floor.`,
    color: 0x00ff00, // A bright green hex color for the embed border
    fields: [
      {
        name: "Set",
        value: card.setName,
        inline: true,
      },
      {
        name: "Card Number",
        value: card.cardNumber,
        inline: true,
      },
      {
        name: "Current Floor Price",
        value: `$${currentPrice.toFixed(2)}`,
        inline: false,
      },
      {
        name: "Game",
        value: card.game, // e.g., "One Piece" or "Pokemon"
        inline: true,
      }
    ],
    footer: {
      text: "Last Pack Magic Tracker",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "Last Pack Magic", // Overrides the default webhook name
        embeds: [embed],
      }),
    });

    if (!response.ok) {
      console.error("❌ Failed to send Discord alert:", response.statusText);
    } else {
      console.log(`✅ Discord alert successfully sent for ${card.name}!`);
    }
  } catch (error) {
    console.error("❌ Error sending Discord webhook:", error);
  }
}