import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { WatchlistItem, PricePoint } from "@/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CardDetailModalProps {
  item: WatchlistItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Formatting helpers ─────────────────────────────────────────

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Analytics calculations ─────────────────────────────────────

function computeAnalytics(item: WatchlistItem) {
  const prices = [...item.priceHistory].reverse(); // oldest → newest
  const listings = prices.map((p) => p.lowestListing);
  const markets = prices.map((p) => p.marketPrice);
  const n = listings.length;

  // Basic stats
  const mean = n > 0 ? listings.reduce((s, v) => s + v, 0) / n : 0;
  const marketMean = n > 0 ? markets.reduce((s, v) => s + v, 0) / n : 0;
  const allTimeLow = n > 0 ? Math.min(...listings) : null;
  const allTimeHigh = n > 0 ? Math.max(...listings) : null;
  const marketLow = n > 0 ? Math.min(...markets) : null;
  const marketHigh = n > 0 ? Math.max(...markets) : null;

  // Coefficient of Variation
  let cv: number | null = null;
  if (n >= 2 && mean > 0) {
    const squaredDiffs = listings.map((p) => (p - mean) ** 2);
    const stdev = Math.sqrt(squaredDiffs.reduce((s, d) => s + d, 0) / n);
    cv = stdev / mean;
  }

  // Linear regression slope (normalized)
  let trendSlope: number | null = null;
  let trendDirection: "up" | "down" | "flat" = "flat";
  if (n >= 3 && mean > 0) {
    const xMean = (n - 1) / 2;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (listings[i]! - mean);
      den += (i - xMean) ** 2;
    }
    const slope = num / den;
    trendSlope = slope / mean; // normalized
    if (trendSlope > 0.01) trendDirection = "up";
    else if (trendSlope < -0.01) trendDirection = "down";
    else trendDirection = "flat";
  }

  // Spread analysis (market vs lowest)
  let avgSpread: number | null = null;
  let avgSpreadPercent: number | null = null;
  let currentSpread: number | null = null;
  let currentSpreadPercent: number | null = null;
  if (n > 0) {
    const spreads = prices.map((p) => p.marketPrice - p.lowestListing);
    avgSpread = spreads.reduce((s, v) => s + v, 0) / n;
    avgSpreadPercent = marketMean > 0 ? avgSpread / marketMean : null;

    const latest = prices[n - 1]!;
    currentSpread = latest.marketPrice - latest.lowestListing;
    currentSpreadPercent =
      latest.marketPrice > 0
        ? currentSpread / latest.marketPrice
        : null;
  }

  // Buy signal (distance from snipe target)
  let buySignal: number | null = null;
  if (item.targetSnipePrice && item.latestPrice) {
    const current = item.latestPrice.lowestListing;
    buySignal = (current - item.targetSnipePrice) / item.targetSnipePrice;
  }

  // Price momentum: compare last 3 avg vs first 3 avg
  let momentum: number | null = null;
  if (n >= 6) {
    const recentAvg =
      listings.slice(-3).reduce((s, v) => s + v, 0) / 3;
    const earlyAvg =
      listings.slice(0, 3).reduce((s, v) => s + v, 0) / 3;
    if (earlyAvg > 0) {
      momentum = (recentAvg - earlyAvg) / earlyAvg;
    }
  }

  // Average absolute daily change
  let avgDailyChange: number | null = null;
  if (n >= 2) {
    let totalChange = 0;
    for (let i = 1; i < n; i++) {
      totalChange += Math.abs(listings[i]! - listings[i - 1]!);
    }
    avgDailyChange = totalChange / (n - 1);
  }

  // Discount from market (current)
  let discountFromMarket: number | null = null;
  if (item.latestPrice && item.latestPrice.marketPrice > 0) {
    discountFromMarket =
      (item.latestPrice.marketPrice - item.latestPrice.lowestListing) /
      item.latestPrice.marketPrice;
  }

  // Days on watchlist
  const daysOnWatchlist = Math.floor(
    (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Floor confidence — mirrors the server's CV_THRESHOLD (3%) and SLOPE_THRESHOLD (1%)
  let floorConfidence: number | null = null;
  if (cv !== null && trendSlope !== null) {
    const cvScore = Math.max(0, 1 - cv / 0.03); // 1.0 when cv=0, 0 when cv>=0.03
    const slopeScore = Math.max(
      0,
      1 - Math.abs(trendSlope) / 0.01
    ); // 1.0 when slope=0
    floorConfidence = (cvScore + slopeScore) / 2;
  }

  // Price range (high - low) as % of mean
  let priceRange: number | null = null;
  if (allTimeLow !== null && allTimeHigh !== null && mean > 0) {
    priceRange = (allTimeHigh - allTimeLow) / mean;
  }

  return {
    mean,
    marketMean,
    allTimeLow,
    allTimeHigh,
    marketLow,
    marketHigh,
    cv,
    trendSlope,
    trendDirection,
    avgSpread,
    avgSpreadPercent,
    currentSpread,
    currentSpreadPercent,
    buySignal,
    momentum,
    avgDailyChange,
    discountFromMarket,
    daysOnWatchlist,
    floorConfidence,
    priceRange,
  };
}

// ─── Sub-components ─────────────────────────────────────────────

function MetricCard({
  label,
  value,
  subValue,
  color = "cyan",
}: {
  label: string;
  value: string;
  subValue?: string;
  color?: "cyan" | "magenta" | "green" | "yellow" | "orange" | "red";
}) {
  const colorMap = {
    cyan: {
      border: "border-neon-cyan/15",
      glow: "neon-glow-cyan",
      text: "neon-text-cyan",
      bg: "bg-neon-cyan/5",
    },
    magenta: {
      border: "border-neon-magenta/15",
      glow: "neon-glow-magenta",
      text: "neon-text-magenta",
      bg: "bg-neon-magenta/5",
    },
    green: {
      border: "border-neon-green/15",
      glow: "neon-glow-green",
      text: "neon-text-green",
      bg: "bg-neon-green/5",
    },
    yellow: {
      border: "border-neon-yellow/15",
      glow: "neon-glow-yellow",
      text: "neon-text-yellow",
      bg: "bg-neon-yellow/5",
    },
    orange: {
      border: "border-neon-orange/15",
      glow: "",
      text: "neon-text-orange",
      bg: "bg-neon-orange/5",
    },
    red: {
      border: "border-neon-red/15",
      glow: "",
      text: "text-neon-red",
      bg: "bg-neon-red/5",
    },
  };
  const c = colorMap[color];
  return (
    <div
      className={`rounded-lg border ${c.border} ${c.bg} ${c.glow} p-3 text-center`}
    >
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono ${c.text}`}>{value}</div>
      {subValue && (
        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
          {subValue}
        </div>
      )}
    </div>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-neon-cyan/20 bg-[#0a0a0f]/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <div className="text-[10px] font-mono text-muted-foreground mb-1">
        {label}
      </div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs font-mono">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">
            {entry.dataKey === "lowestListing" ? "Lowest" : "Market"}:
          </span>
          <span className="text-foreground font-medium">
            ${entry.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function CardDetailModal({
  item,
  open,
  onOpenChange,
}: CardDetailModalProps) {
  if (!item) return null;

  const analytics = computeAnalytics(item);
  const chartData = [...item.priceHistory]
    .reverse() // oldest first
    .map((p: PricePoint) => ({
      date: formatDateShort(p.timestamp),
      lowestListing: p.lowestListing,
      marketPrice: p.marketPrice,
    }));

  const trendIcon =
    analytics.trendDirection === "up"
      ? "↗"
      : analytics.trendDirection === "down"
        ? "↘"
        : "→";
  const trendLabel =
    analytics.trendDirection === "up"
      ? "Rising"
      : analytics.trendDirection === "down"
        ? "Declining"
        : "Stable";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {/* ── Header ── */}
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-6">
            <div>
              <DialogTitle className="text-xl font-mono neon-text-cyan">
                {item.card.name}
              </DialogTitle>
              <DialogDescription className="mt-1 font-mono text-xs space-x-2">
                <span className="text-muted-foreground">
                  {item.card.setName}
                </span>
                <span className="text-neon-cyan/30">·</span>
                <span className="text-neon-magenta/60">#{item.card.cardNumber}</span>
                <span className="text-neon-cyan/30">·</span>
                <a
                  href={`https://www.tcgplayer.com/product/${item.card.tcgplayerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neon-blue hover:underline"
                >
                  TCGplayer ↗
                </a>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded border border-neon-magenta/20 bg-neon-magenta/5 px-1.5 py-0.5 text-[10px] font-mono text-neon-magenta uppercase">
                {item.card.game}
              </span>
              {item.isSettled ? (
                <Badge className="border-neon-green/30 bg-neon-green/10 text-neon-green shadow-[0_0_8px_rgba(57,255,20,0.2)]">
                  SETTLED
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-neon-magenta/30 text-neon-magenta animate-neon-pulse"
                >
                  TRACKING
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── Price Overview ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Lowest Listing"
            value={formatPrice(item.latestPrice?.lowestListing)}
            subValue={
              analytics.allTimeLow !== null
                ? `ATL: ${formatPrice(analytics.allTimeLow)}`
                : undefined
            }
            color="green"
          />
          <MetricCard
            label="Market Price"
            value={formatPrice(item.latestPrice?.marketPrice)}
            subValue={`Avg: ${formatPrice(analytics.marketMean || null)}`}
            color="cyan"
          />
          <MetricCard
            label="Snipe Target"
            value={formatPrice(item.targetSnipePrice)}
            subValue={
              analytics.buySignal !== null
                ? `${analytics.buySignal > 0 ? "Above" : "Below"} by ${formatPercent(Math.abs(analytics.buySignal))}`
                : "No target set"
            }
            color="yellow"
          />
          <MetricCard
            label="Mkt-List Spread"
            value={formatPrice(analytics.currentSpread)}
            subValue={formatPercent(analytics.currentSpreadPercent)}
            color="magenta"
          />
        </div>

        {/* ── Price History Chart ── */}
        {chartData.length > 1 && (
          <div className="rounded-lg border border-neon-cyan/10 bg-card/30 p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
              <span className="neon-text-cyan">&gt;</span> Price History
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="gradListing"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#39ff14"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="#39ff14"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="gradMarket"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#00fff5"
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="95%"
                      stopColor="#00fff5"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,255,245,0.06)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#6b6b8a", fontFamily: "monospace" }}
                  axisLine={{ stroke: "rgba(0,255,245,0.1)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#6b6b8a", fontFamily: "monospace" }}
                  axisLine={{ stroke: "rgba(0,255,245,0.1)" }}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${v}`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={<ChartTooltipContent />}
                  cursor={{ stroke: "rgba(0,255,245,0.2)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }}
                  formatter={(value: string) =>
                    value === "lowestListing" ? "Lowest Listing" : "Market Price"
                  }
                />
                <Area
                  type="monotone"
                  dataKey="lowestListing"
                  stroke="#39ff14"
                  strokeWidth={2}
                  fill="url(#gradListing)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#39ff14", stroke: "#0a0a0f", strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="marketPrice"
                  stroke="#00fff5"
                  strokeWidth={2}
                  fill="url(#gradMarket)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#00fff5", stroke: "#0a0a0f", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Analytics Grid ── */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            <span className="neon-text-magenta">&gt;</span> Computed Analytics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Volatility (CV)"
              value={
                analytics.cv !== null
                  ? `${(analytics.cv * 100).toFixed(1)}%`
                  : "—"
              }
              subValue={
                analytics.cv !== null
                  ? analytics.cv <= 0.03
                    ? "Low — stable"
                    : analytics.cv <= 0.08
                      ? "Moderate"
                      : "High — volatile"
                  : "Need more data"
              }
              color={
                analytics.cv !== null
                  ? analytics.cv <= 0.03
                    ? "green"
                    : analytics.cv <= 0.08
                      ? "yellow"
                      : "red"
                  : "cyan"
              }
            />
            <MetricCard
              label="Price Trend"
              value={`${trendIcon} ${trendLabel}`}
              subValue={
                analytics.trendSlope !== null
                  ? `Slope: ${formatPercent(analytics.trendSlope)}/pt`
                  : undefined
              }
              color={
                analytics.trendDirection === "down"
                  ? "green"
                  : analytics.trendDirection === "up"
                    ? "orange"
                    : "cyan"
              }
            />
            <MetricCard
              label="Floor Confidence"
              value={
                analytics.floorConfidence !== null
                  ? `${(analytics.floorConfidence * 100).toFixed(0)}%`
                  : "—"
              }
              subValue={
                analytics.floorConfidence !== null
                  ? analytics.floorConfidence >= 0.8
                    ? "Near floor"
                    : analytics.floorConfidence >= 0.5
                      ? "Stabilizing"
                      : "Still moving"
                  : "Insufficient data"
              }
              color={
                analytics.floorConfidence !== null
                  ? analytics.floorConfidence >= 0.8
                    ? "green"
                    : analytics.floorConfidence >= 0.5
                      ? "yellow"
                      : "orange"
                  : "cyan"
              }
            />
            <MetricCard
              label="Momentum"
              value={
                analytics.momentum !== null
                  ? formatPercent(analytics.momentum)
                  : "—"
              }
              subValue={
                analytics.momentum !== null
                  ? analytics.momentum > 0.02
                    ? "Accelerating up"
                    : analytics.momentum < -0.02
                      ? "Accelerating down"
                      : "Neutral"
                  : "Need 6+ points"
              }
              color={
                analytics.momentum !== null
                  ? analytics.momentum > 0.02
                    ? "orange"
                    : analytics.momentum < -0.02
                      ? "green"
                      : "cyan"
                  : "cyan"
              }
            />
            <MetricCard
              label="Avg Spread"
              value={formatPrice(analytics.avgSpread)}
              subValue={formatPercent(analytics.avgSpreadPercent)}
              color="magenta"
            />
            <MetricCard
              label="Avg |Δ Price|"
              value={formatPrice(analytics.avgDailyChange)}
              subValue="Per data point"
              color="cyan"
            />
            <MetricCard
              label="Market Discount"
              value={
                analytics.discountFromMarket !== null
                  ? `${(analytics.discountFromMarket * 100).toFixed(1)}%`
                  : "—"
              }
              subValue="Lowest vs market"
              color={
                analytics.discountFromMarket !== null &&
                analytics.discountFromMarket > 0.1
                  ? "green"
                  : "cyan"
              }
            />
            <MetricCard
              label="Price Range"
              value={
                analytics.priceRange !== null
                  ? `${(analytics.priceRange * 100).toFixed(1)}%`
                  : "—"
              }
              subValue={
                analytics.allTimeLow !== null && analytics.allTimeHigh !== null
                  ? `${formatPrice(analytics.allTimeLow)} – ${formatPrice(analytics.allTimeHigh)}`
                  : undefined
              }
              color="yellow"
            />
          </div>
        </div>

        {/* ── Tracking Info Footer ── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-neon-cyan/10 pt-3 text-[10px] font-mono text-muted-foreground">
          <span>
            <span className="text-neon-cyan/50">WATCHLIST_AGE:</span>{" "}
            {analytics.daysOnWatchlist}d
          </span>
          <span>
            <span className="text-neon-cyan/50">DATA_POINTS:</span>{" "}
            {item.priceHistory.length}
          </span>
          <span>
            <span className="text-neon-cyan/50">LAST_ALERT:</span>{" "}
            {formatDateFull(item.lastAlertSent)}
          </span>
          <span>
            <span className="text-neon-cyan/50">ADDED:</span>{" "}
            {formatDateFull(item.createdAt)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
