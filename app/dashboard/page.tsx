"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import {
  type PortfolioHolding,
  type PortfolioMetrics,
} from "@/components/dashboard/portfolio-overview";
import { TradeModal, type TradeDraft } from "@/components/dashboard/trade-modal";
import type { TransactionRecord } from "@/components/dashboard/transaction-history-table";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { type DashboardTab } from "@/components/dashboard/tabs";
import { auth } from "@/lib/firebase";
import {
  addWatchlistItem,
  executeBuyTrade,
  executeSellTrade,
  getBackendHealth,
  initCurrentUser,
  getHoldings,
  getPortfolio,
  getTransactions,
  getWatchlist,
  removeWatchlistItem,
  type ApiWatchlistItem,
} from "@/lib/api";
import {
  DEFAULT_PORTFOLIO_SNAPSHOT,
  INITIAL_BUYING_POWER,
  publishPortfolioSnapshot,
} from "@/lib/portfolio-store";



export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>("Dashboard");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [activeTrade, setActiveTrade] = useState<TradeDraft | null>(null);
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<"connected" | "disconnected">(
    "disconnected",
  );
  const [backendMessage, setBackendMessage] = useState<string>("Checking backend...");
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [watchlist, setWatchlist] = useState<ApiWatchlistItem[]>([]);
  const [buyingPower, setBuyingPower] = useState<number>(INITIAL_BUYING_POWER);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(INITIAL_BUYING_POWER);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    router.push("/");
  }, [router]);

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode((current) => !current);
  }, []);

  const handleTabChange = useCallback((tab: DashboardTab) => {
    setActiveTab(tab);
  }, []);

  const handleTradeAction = useCallback((trade: TradeDraft) => {
    setTradeMessage(null);
    if (trade.type === "sell") {
      const availableShares =
        holdings.find((holding) => holding.ticker === trade.ticker)?.quantity ?? 0;

      if (availableShares <= 0) {
        setTradeMessage(`Cannot sell ${trade.ticker}: no shares available in holdings.`);
        return;
      }

      setActiveTrade({
        ...trade,
        maxShares: availableShares,
      });
      return;
    }

    setActiveTrade(trade);
  }, [holdings]);

  const handleAddWatchlist = useCallback(async (item: ApiWatchlistItem) => {
    const user = auth.currentUser;
    if (!user) {
      setTradeMessage("Please sign in again to update your watchlist.");
      return;
    }

    try {
      const token = await user.getIdToken();
      const saved = await addWatchlistItem(token, {
        symbol: item.ticker,
        exchange: item.exchange,
        companyName: item.companyName,
      });

      if (!saved) {
        return;
      }

      setWatchlist((previous) => {
        const filtered = previous.filter(
          (entry) => !(entry.ticker === saved.ticker && entry.exchange === saved.exchange),
        );
        return [...filtered, saved].sort((left, right) => left.ticker.localeCompare(right.ticker));
      });
    } catch (error) {
      setTradeMessage(error instanceof Error ? error.message : "Could not update watchlist.");
    }
  }, []);

  const handleRemoveWatchlist = useCallback(async (item: ApiWatchlistItem) => {
    const user = auth.currentUser;
    if (!user) {
      setTradeMessage("Please sign in again to update your watchlist.");
      return;
    }

    try {
      const token = await user.getIdToken();
      await removeWatchlistItem(token, { symbol: item.ticker, exchange: item.exchange });
      setWatchlist((previous) =>
        previous.filter(
          (entry) => !(entry.ticker === item.ticker && entry.exchange === item.exchange),
        ),
      );
    } catch (error) {
      setTradeMessage(error instanceof Error ? error.message : "Could not update watchlist.");
    }
  }, []);

  const handleTradeConfirm = useCallback(
    async (shares: number) => {
      if (!activeTrade) {
        return;
      }

      if (activeTrade.type === "sell") {
        const availableShares =
          holdings.find((holding) => holding.ticker === activeTrade.ticker)?.quantity ?? 0;

        if (shares > availableShares) {
          setTradeMessage(`Cannot sell ${shares} shares of ${activeTrade.ticker}.`);
          return;
        }
      }

      if (!activeTrade.exchange) {
        setTradeMessage(`Exchange is missing for ${activeTrade.ticker}.`);
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        setTradeMessage("Please sign in again to place a trade.");
        return;
      }

      try {
        const token = await user.getIdToken();
        const request = {
          symbol: activeTrade.ticker,
          exchange: activeTrade.exchange,
          quantity: shares,
        };

        if (activeTrade.type === "buy") {
          await executeBuyTrade(token, request);
        } else {
          await executeSellTrade(token, request);
        }

        const [portfolio, holdingsData, transactionsData] = await Promise.all([
          getPortfolio(token),
          getHoldings(token),
          getTransactions(token),
        ]);

        setHoldings(
          holdingsData.map((holding) => ({
            ticker: holding.ticker,
            companyName: holding.companyName,
            exchange: holding.exchange,
            displayName: holding.displayName,
            quantity: holding.quantity,
            currentPrice: holding.currentPrice,
            holdPrice: holding.holdPrice,
            totalPL: holding.totalPL,
          })),
        );
        setTransactions(
          transactionsData.map((transaction) => ({
            id: transaction.id,
            dateTime: transaction.dateTime,
            ticker: transaction.ticker,
            company: transaction.company,
            type: transaction.type,
            shares: transaction.shares,
            price: transaction.price,
          })),
        );
        setBuyingPower(portfolio?.buyingPower ?? INITIAL_BUYING_POWER);
        setTotalPortfolioValue(portfolio?.totalPortfolioValue ?? INITIAL_BUYING_POWER);
        setTradeMessage(null);
        setActiveTrade(null);
      } catch (error) {
        setTradeMessage(error instanceof Error ? error.message : "Trade execution failed.");
      }
    },
    [activeTrade, holdings],
  );

  const portfolioMetrics: PortfolioMetrics = useMemo(() => {
    const investmentValue = holdings.reduce(
      (sum, holding) => sum + (holding.holdPrice ?? 0) * (holding.quantity ?? 0),
      0,
    );
    const marketValue = holdings.reduce(
      (sum, holding) => sum + (holding.currentPrice ?? 0) * (holding.quantity ?? 0),
      0,
    );
    const unrealisedPL = marketValue - investmentValue;
    const todaysPL = holdings.reduce((sum, holding) => sum + (holding.totalPL ?? 0), 0);
    return {
      totalPortfolioValue,
      investmentValue,
      unrealisedPL,
      todaysPL,
      buyingPower,
    };
  }, [buyingPower, holdings, totalPortfolioValue]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;

    const checkBackend = async () => {
      const result = await getBackendHealth();
      if (!isMounted) {
        return;
      }
      setBackendStatus(result.ok ? "connected" : "disconnected");
      setBackendMessage(result.message ?? (result.ok ? "Backend connected" : "Backend unreachable"));
    };

    void checkBackend();
    const interval = window.setInterval(checkBackend, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    publishPortfolioSnapshot({
      totalPortfolioValue:
        portfolioMetrics.totalPortfolioValue ?? DEFAULT_PORTFOLIO_SNAPSHOT.totalPortfolioValue,
      investmentValue: portfolioMetrics.investmentValue ?? DEFAULT_PORTFOLIO_SNAPSHOT.investmentValue,
      unrealisedPL: portfolioMetrics.unrealisedPL ?? DEFAULT_PORTFOLIO_SNAPSHOT.unrealisedPL,
      todaysPL: portfolioMetrics.todaysPL ?? DEFAULT_PORTFOLIO_SNAPSHOT.todaysPL,
      buyingPower: portfolioMetrics.buyingPower ?? DEFAULT_PORTFOLIO_SNAPSHOT.buyingPower,
    });
  }, [portfolioMetrics]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (isMounted) {
          router.push("/");
        }
        return;
      }

      try {
        const token = await user.getIdToken();
        await initCurrentUser(token);

        const [portfolio, holdingsData, transactionsData, watchlistData] =
          await Promise.allSettled([
            getPortfolio(token),
            getHoldings(token),
            getTransactions(token),
            getWatchlist(token),
          ]);

        if (!isMounted) {
          return;
        }

        setHoldings(
          holdingsData.status === "fulfilled"
            ? holdingsData.value.map((holding) => ({
                ticker: holding.ticker,
                companyName: holding.companyName,
                exchange: holding.exchange,
                displayName: holding.displayName,
                quantity: holding.quantity,
                currentPrice: holding.currentPrice,
                holdPrice: holding.holdPrice,
                totalPL: holding.totalPL,
              }))
            : [],
        );
        setTransactions(
          transactionsData.status === "fulfilled"
            ? transactionsData.value.map((transaction) => ({
                id: transaction.id,
                dateTime: transaction.dateTime,
                ticker: transaction.ticker,
                company: transaction.company,
                type: transaction.type,
                shares: transaction.shares,
                price: transaction.price,
              }))
            : [],
        );
        setWatchlist(watchlistData.status === "fulfilled" ? watchlistData.value : []);
        setBuyingPower(
          portfolio.status === "fulfilled"
            ? portfolio.value?.buyingPower ?? INITIAL_BUYING_POWER
            : INITIAL_BUYING_POWER,
        );
        setTotalPortfolioValue(
          portfolio.status === "fulfilled"
            ? portfolio.value?.totalPortfolioValue ?? INITIAL_BUYING_POWER
            : INITIAL_BUYING_POWER,
        );

        const loadErrors = [
          portfolio.status === "rejected"
            ? `portfolio: ${portfolio.reason instanceof Error ? portfolio.reason.message : "failed"}`
            : null,
          holdingsData.status === "rejected"
            ? `holdings: ${holdingsData.reason instanceof Error ? holdingsData.reason.message : "failed"}`
            : null,
          transactionsData.status === "rejected"
            ? `transactions: ${transactionsData.reason instanceof Error ? transactionsData.reason.message : "failed"}`
            : null,
          watchlistData.status === "rejected"
            ? `watchlist: ${watchlistData.reason instanceof Error ? watchlistData.reason.message : "failed"}`
            : null,
        ].filter(Boolean);

        setTradeMessage(loadErrors.length > 0 ? `Some data could not load: ${loadErrors.join(" | ")}` : null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setTradeMessage(
          error instanceof Error
            ? error.message
            : "Could not load your portfolio data from backend.",
        );
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  return (
    <main className={`ta-dashboard ${isDarkMode ? "dark" : "light"}`}>
      <DashboardTopbar
        activeTab={activeTab}
        isDarkMode={isDarkMode}
        onTabChange={handleTabChange}
        onThemeToggle={handleThemeToggle}
        onLogout={handleLogout}
      />
      <div className="ta-backend-status-wrap">
        <span className={`ta-backend-status-pill ${backendStatus}`}>
          Backend: {backendStatus === "connected" ? "Connected" : "Disconnected"}
        </span>
        <span className="ta-backend-status-text">{backendMessage}</span>
      </div>
      <DashboardContent
        activeTab={activeTab}
        portfolioMetrics={portfolioMetrics}
        holdings={holdings}
        isDarkMode={isDarkMode}
        transactions={transactions}
        watchlist={watchlist}
        onTradeAction={handleTradeAction}
        onAddWatchlist={handleAddWatchlist}
        onRemoveWatchlist={handleRemoveWatchlist}
      />
      {tradeMessage ? <p className="ta-global-message">{tradeMessage}</p> : null}
      {activeTrade ? (
        <TradeModal
          trade={activeTrade}
          onCancel={() => setActiveTrade(null)}
          onConfirm={handleTradeConfirm}
          message={tradeMessage}
        />
      ) : null}
    </main>
  );
}
