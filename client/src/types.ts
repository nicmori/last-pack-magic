export interface PricePoint {
  marketPrice: number;
  lowestListing: number;
  timestamp: string;
}

export interface CardInfo {
  name: string;
  setName: string;
  cardNumber: string;
  game: string;
  tcgplayerId: number;
}

export interface WatchlistItem {
  id: string;
  cardId: string;
  targetSnipePrice: number | null;
  isSettled: boolean;
  lastAlertSent: string | null;
  createdAt: string;
  card: CardInfo;
  priceHistory: PricePoint[];
  latestPrice: PricePoint | null;
}

export interface Stats {
  totalCards: number;
  settledCount: number;
  activeCount: number;
  totalPricePoints: number;
}
