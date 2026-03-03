import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Stats } from "@/types";

interface StatsCardsProps {
  stats: Stats;
}

const statConfig = [
  {
    label: "Total Cards",
    key: "totalCards" as const,
    colorClass: "neon-text-cyan",
    glowClass: "neon-glow-cyan",
    borderClass: "border-neon-cyan/20",
    icon: "◆",
  },
  {
    label: "Active Tracking",
    key: "activeCount" as const,
    colorClass: "neon-text-magenta",
    glowClass: "neon-glow-magenta",
    borderClass: "border-neon-magenta/20",
    icon: "◈",
  },
  {
    label: "Floors Found",
    key: "settledCount" as const,
    colorClass: "neon-text-green",
    glowClass: "neon-glow-green",
    borderClass: "border-neon-green/20",
    icon: "▼",
  },
  {
    label: "Price Points",
    key: "totalPricePoints" as const,
    colorClass: "neon-text-yellow",
    glowClass: "neon-glow-yellow",
    borderClass: "border-neon-yellow/20",
    icon: "●",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {statConfig.map((s) => (
        <Card
          key={s.key}
          className={`${s.glowClass} ${s.borderClass} bg-card/80 backdrop-blur-sm transition-all hover:scale-[1.02]`}
        >
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-muted-foreground">
              <span className={s.colorClass}>{s.icon}</span>
              {s.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-3xl font-bold font-mono ${s.colorClass}`}>
              {stats[s.key]}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
