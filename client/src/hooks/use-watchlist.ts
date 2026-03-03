import { useState, useEffect, useCallback } from "react";
import type { WatchlistItem, Stats } from "@/types";

const API_BASE = "http://localhost:3001/api";

export function useWatchlist() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [watchlistRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/watchlist`),
        fetch(`${API_BASE}/stats`),
      ]);

      if (!watchlistRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch data from server");
      }

      const watchlistData: WatchlistItem[] = await watchlistRes.json();
      const statsData: Stats = await statsRes.json();

      setItems(watchlistData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, stats, loading, error, refetch: fetchData };
}
