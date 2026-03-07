# Last Pack Magic — Client

React + TypeScript dashboard for tracking TCG card price floors and snipe alerts.

## Tech Stack

- **React 18** + **TypeScript** via **Vite**
- **Tailwind CSS v4** for styling (neon/cyberpunk theme)
- **Radix UI** + **shadcn/ui** components
- **Lucide React** icons

## Getting Started

```bash
npm install
npm run dev        # starts Vite dev server (default :5173)
```

> The dashboard expects the API server to be running on `http://localhost:3001`.

## Scripts

| Script            | Description                   |
| ----------------- | ----------------------------- |
| `npm run dev`     | Start Vite dev server w/ HMR  |
| `npm run build`   | Type-check & production build |
| `npm run lint`    | Run ESLint                    |
| `npm run preview` | Preview production build      |

## Project Structure

```
src/
├── App.tsx                  # Main dashboard layout
├── components/
│   ├── stats-cards.tsx      # Summary stat cards
│   ├── watchlist-table.tsx  # Watchlist data table
│   └── ui/                  # shadcn/ui primitives
├── hooks/
│   └── use-watchlist.ts     # Data-fetching hook (GET /api/watchlist & /api/stats)
├── lib/
│   └── utils.ts             # Tailwind merge helpers
└── types.ts                 # Shared TypeScript types
```
