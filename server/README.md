# Last Pack Magic — Server

Express + Prisma backend that fetches TCG card prices from JustTCG, stores history in SQLite, and exposes a REST API for the dashboard.

## Tech Stack

- **Express 5** + **TypeScript** (via `tsx`)
- **Prisma** ORM with **SQLite** (better-sqlite3 adapter)
- **node-cron** for scheduled price fetches (every 4 hours)
- **JustTCG API** as the price data source

## Getting Started

```bash
npm install

# Set up your environment
# Create a .env file with:
#   JUSTTCG_API_KEY=your_key_here

# Generate Prisma client & create the database
npx prisma generate
npx prisma db push

# Seed the watchlist with initial cards
npm run seed

# Start the server
npm run dev        # runs on http://localhost:3001
```

## Scripts

| Script         | Description                          |
| -------------- | ------------------------------------ |
| `npm run dev`  | Start the server with `tsx`          |
| `npm run seed` | Seed the database with starter cards |

## API Routes

| Method | Endpoint          | Description                           |
| ------ | ----------------- | ------------------------------------- |
| GET    | `/api/watchlist`   | Full watchlist with price history     |
| GET    | `/api/stats`       | Summary stats (total cards, settled, etc.) |

## Project Structure

```
src/
├── index.ts       # Express server + cron scheduler
├── api.ts         # REST route handlers
├── fetcher.ts     # JustTCG price fetcher
├── math.ts        # Floor-detection / analysis logic
├── alert.ts       # Alert / notification logic
├── prisma.ts      # Prisma client instance
└── seed.ts        # Database seed script
prisma/
└── schema.prisma  # Card, PriceHistory, Watchlist models
```

## Data Models

- **Card** — TCGplayer ID, name, set, game
- **PriceHistory** — market price + lowest listing snapshots over time
- **Watchlist** — tracked cards with optional snipe price targets and settled status
