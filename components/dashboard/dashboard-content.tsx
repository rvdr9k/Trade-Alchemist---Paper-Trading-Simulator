import { memo } from "react";
import {
  PortfolioOverview,
  type PortfolioHolding,
  type PortfolioMetrics,
} from "@/components/dashboard/portfolio-overview";
import { BuyPage } from "@/components/dashboard/buy-page";
import { SellPage } from "@/components/dashboard/sell-page";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import type { TradeDraft } from "@/components/dashboard/trade-modal";
import {
  TransactionHistoryTable,
  type TransactionRecord,
} from "@/components/dashboard/transaction-history-table";
import { MarketWatch } from "@/components/market-watch/market-watch";
import { ChartsPage } from "@/components/dashboard/charts-page";
import type { DashboardTab } from "@/components/dashboard/tabs";
import type { ApiWatchlistItem } from "@/lib/api";

type DashboardContentProps = {
  activeTab: DashboardTab;
  portfolioMetrics?: PortfolioMetrics;
  holdings?: PortfolioHolding[];
  isDarkMode: boolean;
  transactions: TransactionRecord[];
  watchlist: ApiWatchlistItem[];
  onTradeAction: (trade: TradeDraft) => void;
  onAddWatchlist: (item: ApiWatchlistItem) => Promise<void>;
  onRemoveWatchlist: (item: ApiWatchlistItem) => Promise<void>;
  priceRefreshVersion: number;
};

export const DashboardContent = memo(function DashboardContent({
  activeTab,
  portfolioMetrics,
  holdings,
  isDarkMode,
  transactions,
  watchlist,
  onTradeAction,
  onAddWatchlist,
  onRemoveWatchlist,
  priceRefreshVersion,
}: DashboardContentProps) {
  if (activeTab === "Dashboard") {
    return (
      <DashboardHome
        holdings={holdings}
        transactions={transactions}
        watchlist={watchlist}
        isDarkMode={isDarkMode}
        onTradeAction={onTradeAction}
        onAddWatchlist={onAddWatchlist}
        onRemoveWatchlist={onRemoveWatchlist}
        priceRefreshVersion={priceRefreshVersion}
      />
    );
  }

  if (activeTab === "Portfolio") {
    return (
      <PortfolioOverview
        metrics={portfolioMetrics}
        holdings={holdings}
        onTradeAction={onTradeAction}
      />
    );
  }

  if (activeTab === "Market Watch") {
    return (
        <MarketWatch
          isDarkMode={isDarkMode}
          holdings={holdings}
          watchlist={watchlist}
          onTradeAction={onTradeAction}
          onAddWatchlist={onAddWatchlist}
          onRemoveWatchlist={onRemoveWatchlist}
          priceRefreshVersion={priceRefreshVersion}
        />
      );
  }

  if (activeTab === "Buy") {
    return (
      <BuyPage
        holdings={holdings}
        onTradeAction={onTradeAction}
        priceRefreshVersion={priceRefreshVersion}
      />
    );
  }

  if (activeTab === "Sell") {
    return <SellPage holdings={holdings} onTradeAction={onTradeAction} />;
  }

  if (activeTab === "Transaction History") {
    return <TransactionHistoryTable transactions={transactions} />;
  }

  if (activeTab === "Analysis") {
    return <ChartsPage priceRefreshVersion={priceRefreshVersion} />;
  }

  return null;
});
