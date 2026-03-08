import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CardDetailModal } from "@/components/card-detail-modal";
import type { WatchlistItem } from "@/types";

interface WatchlistTableProps {
  items: WatchlistItem[];
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WatchlistTable({ items }: WatchlistTableProps) {
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-neon-cyan/10 bg-card/50 p-8 text-center font-mono text-sm text-muted-foreground neon-glow-cyan">
        <span className="neon-text-cyan">&gt;</span> No cards on the watchlist yet. Run{" "}
        <code className="rounded border border-neon-cyan/20 bg-neon-cyan/5 px-1.5 py-0.5 text-neon-cyan">
          npm run seed
        </code>{" "}
        on the server to add some.
      </div>
    );
  }

  return (
    <>
    <CardDetailModal
      item={selectedItem}
      open={modalOpen}
      onOpenChange={setModalOpen}
    />
    <div className="overflow-hidden rounded-lg border border-neon-cyan/15 bg-card/60 backdrop-blur-sm neon-glow-cyan">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-neon-cyan/10 hover:bg-transparent">
            <TableHead className="font-mono text-xs tracking-wider uppercase neon-text-cyan">Card</TableHead>
            <TableHead className="font-mono text-xs tracking-wider uppercase neon-text-cyan">Set</TableHead>
            <TableHead className="font-mono text-xs tracking-wider uppercase neon-text-cyan">Game</TableHead>
            <TableHead className="text-right font-mono text-xs tracking-wider uppercase neon-text-cyan">Latest</TableHead>
            <TableHead className="text-right font-mono text-xs tracking-wider uppercase neon-text-cyan">Market</TableHead>
            <TableHead className="text-right font-mono text-xs tracking-wider uppercase neon-text-cyan">Snipe</TableHead>
            <TableHead className="text-center font-mono text-xs tracking-wider uppercase neon-text-cyan">Status</TableHead>
            <TableHead className="font-mono text-xs tracking-wider uppercase neon-text-cyan">Alert</TableHead>
            <TableHead className="text-right font-mono text-xs tracking-wider uppercase neon-text-cyan">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="border-b border-neon-cyan/5 transition-colors hover:bg-neon-cyan/5 cursor-pointer"
              onClick={() => {
                setSelectedItem(item);
                setModalOpen(true);
              }}
            >
              <TableCell className="font-medium">
                <div>
                  <div className="text-foreground">{item.card.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">
                    <span className="text-neon-magenta/60">#</span>{item.card.cardNumber}{" "}
                    <span className="text-neon-cyan/40">·</span>{" "}
                    <span className="text-neon-cyan/60">TCG {item.card.tcgplayerId}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{item.card.setName}</TableCell>
              <TableCell>
                <span className="rounded border border-neon-magenta/20 bg-neon-magenta/5 px-1.5 py-0.5 text-xs font-mono text-neon-magenta">
                  {item.card.game}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                <span className={item.latestPrice ? "neon-text-green" : "text-muted-foreground"}>
                  {formatPrice(item.latestPrice?.lowestListing)}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-neon-cyan/80">
                {formatPrice(item.latestPrice?.marketPrice)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                <span className={item.targetSnipePrice ? "neon-text-yellow" : "text-muted-foreground"}>
                  {formatPrice(item.targetSnipePrice)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                {item.isSettled ? (
                  <Badge className="border-neon-green/30 bg-neon-green/10 text-neon-green shadow-[0_0_8px_rgba(57,255,20,0.2)] hover:bg-neon-green/20">
                    SETTLED
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-neon-magenta/30 text-neon-magenta animate-neon-pulse hover:bg-neon-magenta/10"
                  >
                    TRACKING
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm font-mono text-muted-foreground">
                {formatDate(item.lastAlertSent)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums text-neon-cyan/60">
                {item.priceHistory.length}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
