
export type UserProfile = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export type Portfolio = {
    id: string;
    userProfileId: string;
    totalValue: number;
    availableBuyingPower: number;
    dailyGainLoss: number;
    createdAt: string;
    updatedAt: string;
}

export type Holding = {
  id: string;
  portfolioId: string;
  tickerSymbol: string;
  shares: number;
  costBasis: number;
};

export type StockData = {
  id: string;
  ticker: string;
  companyName: string;
  sector: string;
  marketPrice: number;
  dailyChange: number;
  dailyChangePercentage: number;
  exchange: string;
  industry: string;
  currency: string;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  avgVolume: number;
  marketCap: number;
  peRatio: number | null;
  dividendYield: number | null;
  historicalData: HistoricalDataPoint[];
};

export type Trade = {
  id: string;
  portfolioId: string,
  tickerSymbol: string;
  tradeType: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: string;
  realizedProfitLoss?: number;
};

export type Watchlist = {
  id: string;
  userProfileId: string;
  name: string;
  stockSymbols: string[];
};

export type HistoricalDataPoint = {
  date: string;
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
};
