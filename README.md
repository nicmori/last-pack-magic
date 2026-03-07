# Last Pack Magic

TCG price-floor tracker and snipe-alert dashboard. Monitors card prices via the JustTCG API, detects when prices settle, and surfaces buy opportunities on a web dashboard.

## Architecture

```
client/   → React + Vite dashboard (port 5173)
server/   → Express + Prisma API & cron engine (port 3001)
```

## Quick Start

```bash
# Server
cd server
npm install
# Add JUSTTCG_API_KEY to a .env file
npx prisma generate && npx prisma db push
npm run seed
npm run dev

# Client (separate terminal)
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the dashboard.
