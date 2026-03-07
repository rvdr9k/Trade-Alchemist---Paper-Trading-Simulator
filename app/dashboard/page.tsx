"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
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
import { getBackendHealth } from "@/lib/api";
import {
  DEFAULT_PORTFOLIO_SNAPSHOT,
  INITIAL_BUYING_POWER,
  publishPortfolioSnapshot,
  readPortfolioSnapshot,
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

  const handleTradeConfirm = useCallback(
    (shares: number) => {
      if (!activeTrade) {
        return;
      }

      const grossAmount = activeTrade.price * shares;
      const feeAmount = activeTrade.type === "sell" ? grossAmount * 0.02 : 0;
      const netCredit = grossAmount + feeAmount;

      if (activeTrade.type === "sell") {
        const availableShares =
          holdings.find((holding) => holding.ticker === activeTrade.ticker)?.quantity ?? 0;

        if (shares > availableShares) {
          setTradeMessage(`Cannot sell ${shares} shares of ${activeTrade.ticker}.`);
          return;
        }
      }

      if (activeTrade.type === "buy" && grossAmount > buyingPower) {
        setTradeMessage(`Insufficient buying power. Required $${grossAmount.toFixed(2)}.`);
        return;
      }

      const newTransaction: TransactionRecord = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`,
        dateTime: new Date().toISOString(),
        ticker: activeTrade.ticker,
        company: activeTrade.company,
        type: activeTrade.type,
        shares,
        price: activeTrade.price,
      };

      setTransactions((previous) => [newTransaction, ...previous]);

      if (activeTrade.type === "buy") {
        setBuyingPower((previous) => previous - grossAmount);
        setTotalPortfolioValue((previous) => previous - grossAmount);
        setHoldings((previous) => {
          const existing = previous.find(
            (holding) => holding.ticker === activeTrade.ticker,
          );
          if (!existing) {
            return [
              {
                ticker: activeTrade.ticker,
                quantity: shares,
                holdPrice: activeTrade.price,
                currentPrice: activeTrade.price,
                totalPL: 0,
              },
              ...previous,
            ];
          }

          const currentQty = existing.quantity ?? 0;
          const currentHoldPrice = existing.holdPrice ?? activeTrade.price;
          const nextQty = currentQty + shares;
          const avgHoldPrice =
            nextQty > 0
              ? (currentQty * currentHoldPrice + shares * activeTrade.price) / nextQty
              : activeTrade.price;
          const nextCurrentPrice = activeTrade.price;
          const nextTotalPL = (nextCurrentPrice - avgHoldPrice) * nextQty;

          return previous.map((holding) =>
            holding.ticker === activeTrade.ticker
              ? {
                  ...holding,
                  quantity: nextQty,
                  holdPrice: Number(avgHoldPrice.toFixed(2)),
                  currentPrice: nextCurrentPrice,
                  totalPL: Number(nextTotalPL.toFixed(2)),
                }
              : holding,
          );
        });
      }

      if (activeTrade.type === "sell") {
        setBuyingPower((previous) => previous + netCredit);
        setTotalPortfolioValue((previous) => previous + grossAmount);
        setHoldings((previous) =>
          previous
            .map((holding) => {
              if (holding.ticker !== activeTrade.ticker) {
                return holding;
              }
              const currentQty = holding.quantity ?? 0;
              const nextQty = Math.max(0, currentQty - shares);
              return { ...holding, quantity: nextQty };
            })
            .filter((holding) => (holding.quantity ?? 0) > 0),
        );
      }

      setTradeMessage(null);
      setActiveTrade(null);
    },
    [activeTrade, buyingPower, holdings],
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
    const snapshot = readPortfolioSnapshot();
    setBuyingPower(snapshot.buyingPower);
    setTotalPortfolioValue(snapshot.totalPortfolioValue);
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
        onTradeAction={handleTradeAction}
      />
      {tradeMessage ? <p className="ta-global-message">{tradeMessage}</p> : null}
      {activeTrade ? (
        <TradeModal
          trade={activeTrade}
          onCancel={() => setActiveTrade(null)}
          onConfirm={handleTradeConfirm}
        />
      ) : null}
    </main>
  );
}
