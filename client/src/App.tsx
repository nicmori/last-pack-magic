import { useWatchlist } from "@/hooks/use-watchlist";
import { StatsCards } from "@/components/stats-cards";
import { WatchlistTable } from "@/components/watchlist-table";

function App() {
  const { items, stats, loading, error, refetch } = useWatchlist();

  return (
    <div className="min-h-screen bg-background text-foreground grid-bg scanlines">
      {/* Top accent bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-neon-cyan to-transparent opacity-60" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-neon-cyan animate-neon-pulse shadow-[0_0_8px_rgba(0,255,245,0.6)]" />
              <h1 className="text-3xl font-bold tracking-tight font-mono neon-text-cyan">
                LAST PACK MAGIC
              </h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground font-mono tracking-widest uppercase">
              // price floor tracker &amp; snipe alert dashboard
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="group relative rounded-md border border-neon-cyan/30 bg-neon-cyan/5 px-5 py-2.5 text-sm font-mono font-medium text-neon-cyan transition-all hover:bg-neon-cyan/15 hover:border-neon-cyan/60 hover:shadow-[0_0_15px_rgba(0,255,245,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="relative z-10">
              {loading ? "[ REFRESHING... ]" : "[ REFRESH ]"}
            </span>
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-lg border border-neon-red/30 bg-neon-red/5 p-4 font-mono text-sm neon-text-orange">
            <span className="text-neon-red font-bold">ERR:</span> {error}
            <span className="ml-2 text-muted-foreground">
              — make sure server is running on :3001
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="flex items-center justify-center gap-3 py-20 font-mono text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-neon-cyan animate-neon-pulse" />
            Loading dashboard data...
          </div>
        )}

        {/* Dashboard */}
        {!loading && !error && (
          <div className="space-y-8">
            {stats && <StatsCards stats={stats} />}
            <div>
              <h2 className="mb-4 text-sm font-mono font-semibold tracking-widest uppercase text-muted-foreground">
                <span className="neon-text-magenta">&gt;</span> Watchlist
              </h2>
              <WatchlistTable items={items} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="mt-auto h-[1px] w-full bg-gradient-to-r from-transparent via-neon-magenta to-transparent opacity-30" />
    </div>
  );
}

export default App;
