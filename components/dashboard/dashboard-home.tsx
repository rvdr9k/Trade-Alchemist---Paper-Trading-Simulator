"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { PortfolioHolding } from "@/components/dashboard/portfolio-overview";
import type { TradeDraft } from "@/components/dashboard/trade-modal";
import type { TransactionRecord } from "@/components/dashboard/transaction-history-table";
import { searchStocks, type ApiStock } from "@/lib/api";
import { EXCHANGE_OPTIONS, matchesExchangeSelection } from "@/lib/exchanges";

type DashboardHomeProps = {
  holdings?: PortfolioHolding[];
  transactions: TransactionRecord[];
  onTradeAction: (trade: TradeDraft) => void;
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatCurrency(value: number | undefined) {
  if (value === undefined) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrencyByCode(value: number | undefined, currency = "USD") {
  if (value === undefined) {
    return "--";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function getTone(value: number | undefined) {
  if (value === undefined) {
    return "";
  }
  return value < 0 ? "negative" : "positive";
}

export const DashboardHome = memo(function DashboardHome({
  holdings,
  transactions,
  onTradeAction,
}: DashboardHomeProps) {
  const [stocks, setStocks] = useState<ApiStock[]>([]);
  const [selectedExchange, setSelectedExchange] = useState<string>(EXCHANGE_OPTIONS[0]);
  const [query, setQuery] = useState("");
  const [watchlist, setWatchlist] = useState<ApiStock[]>([]);

  useEffect(() => {
    let active = true;

    const loadStocks = async () => {
      try {
        const results = await searchStocks({
          exchange: selectedExchange,
          q: query.trim() || undefined,
        });
        if (!active) {
          return;
        }
        setStocks(results);
      } catch {
        if (!active) {
          return;
        }
        setStocks([]);
      }
    };

    const timeout = window.setTimeout(loadStocks, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [selectedExchange, query]);

  const filteredStocks = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return stocks.filter((stock) => {
      const matchesExchange = selectedExchange
        ? matchesExchangeSelection(stock.exchange, selectedExchange)
        : true;
      const matchesSearch = trimmed
        ? stock.symbol.toLowerCase().includes(trimmed) ||
          stock.companyName.toLowerCase().includes(trimmed)
        : true;
      return matchesExchange && matchesSearch;
    });
  }, [stocks, selectedExchange, query]);

  const selectedStock = filteredStocks[0];
  const stockCurrency = selectedStock?.currency ?? "USD";
  const recentTransactions = transactions.slice(0, 5);
  const previewHoldings = holdings?.slice(0, 5) ?? [];

  return (
    <section className="ta-dashboard-content ta-dashboard-home">
      <h2>Dashboard</h2>

      <article className="ta-dashboard-section-card">
        <h3 className="ta-holdings-title">Search and Buy</h3>
        <div className="ta-buy-search-card">
          <div className="ta-buy-search-row">
            <div className="ta-buy-select-wrap">
              <select
                className="ta-buy-select"
                value={selectedExchange}
                onChange={(event) => setSelectedExchange(event.target.value)}
              >
                {EXCHANGE_OPTIONS.map((exchange) => (
                  <option key={exchange} value={exchange}>
                    {exchange}
                  </option>
                ))}
              </select>
              <span className="ta-buy-select-arrow">▾</span>
            </div>

            <div className="ta-buy-search-input-wrap">
              <span className="ta-buy-search-icon">⌕</span>
              <input
                className="ta-buy-search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search stock by symbol or company"
              />
              {query ? (
                <button
                  type="button"
                  className="ta-buy-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  x
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="ta-buy-selected-card ta-dashboard-selected-row">
          <div>
            <p className="ta-buy-selected-symbol">{selectedStock?.symbol ?? "--"}</p>
            <p className="ta-buy-selected-company">{selectedStock?.companyName ?? "--"}</p>
            <p className="ta-buy-selected-company">
              {selectedStock ? `${selectedStock.exchange} • ${selectedStock.currency ?? "USD"} • ${selectedStock.sector ?? "--"}` : "--"}
            </p>
          </div>
          <div>
            <p className="ta-buy-selected-price">{formatCurrencyByCode(selectedStock?.currentPrice, stockCurrency)}</p>
          </div>
          <div className="ta-dashboard-home-actions">
            <button
              type="button"
              className="ta-buy-action-btn ta-trade-pill buy"
              disabled={!selectedStock?.currentPrice}
              onClick={() => {
                if (!selectedStock?.currentPrice) {
                  return;
                }
                onTradeAction({
                  ticker: selectedStock.symbol,
                  company: selectedStock.companyName,
                  price: selectedStock.currentPrice,
                  type: "buy",
                });
              }}
            >
              Buy
            </button>
            <button
              type="button"
              className="ta-table-action"
              disabled={!selectedStock}
              onClick={() => {
                if (!selectedStock) {
                  return;
                }
                setWatchlist((previous) => {
                  const exists = previous.some(
                    (item) =>
                      item.symbol === selectedStock.symbol &&
                      item.exchange === selectedStock.exchange,
                  );
                  return exists ? previous : [...previous, selectedStock];
                });
              }}
            >
              Add to Watchlist
            </button>
          </div>
        </div>
      </article>

      <div className="ta-dashboard-home-grid">
        <article className="ta-dashboard-section-card">
          <h3 className="ta-holdings-title">Portfolio Holdings Preview</h3>
          <div className="ta-holdings-table-wrap">
            <table className="ta-holdings-table">
              <thead>
                <tr>
                  <th>Stock</th>
                  <th>Current Price</th>
                  <th>Hold Price</th>
                  <th>Total P/L</th>
                </tr>
              </thead>
              <tbody>
                {previewHoldings.length > 0 ? (
                  previewHoldings.map((holding) => (
                    <tr key={holding.ticker}>
                      <td>
                        <p className="ta-holding-ticker">{holding.ticker}</p>
                        <p className="ta-holding-qty">Qty: {holding.quantity ?? "--"}</p>
                      </td>
                      <td>{formatCurrency(holding.currentPrice)}</td>
                      <td>{formatCurrency(holding.holdPrice)}</td>
                      <td className={getTone(holding.totalPL)}>
                        {formatCurrency(holding.totalPL)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="ta-holdings-empty">
                      No holdings available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="ta-dashboard-section-card">
          <h3 className="ta-holdings-title">Watchlist Preview</h3>
          <div className="ta-holdings-table-wrap">
            <table className="ta-holdings-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Company</th>
                  <th>Exchange</th>
                  <th>Trade</th>
                  <th>Delete</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.length > 0 ? (
                  watchlist.map((stock) => (
                    <tr key={`${stock.exchange}-${stock.symbol}`}>
                      <td>{stock.symbol}</td>
                      <td>{stock.companyName}</td>
                      <td>{stock.exchange}</td>
                      <td>
                        <button
                          type="button"
                          className="ta-table-action ta-trade-pill buy"
                          onClick={() => {
                            if (!stock.currentPrice) {
                              return;
                            }
                            onTradeAction({
                              ticker: stock.symbol,
                              company: stock.companyName,
                              price: stock.currentPrice,
                              type: "buy",
                            });
                          }}
                        >
                          Buy
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ta-table-action danger"
                          onClick={() =>
                            setWatchlist((previous) =>
                              previous.filter(
                                (item) =>
                                  !(
                                    item.symbol === stock.symbol &&
                                    item.exchange === stock.exchange
                                  ),
                              ),
                            )
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="ta-holdings-empty">
                      Add stocks from search to preview watchlist.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="ta-dashboard-section-card">
        <h3 className="ta-holdings-title">Recent Transactions</h3>
        <div className="ta-holdings-table-wrap">
          <table className="ta-holdings-table">
            <thead>
              <tr>
                <th>Date time</th>
                <th>Ticker</th>
                <th>Company</th>
                <th>Type</th>
                <th>Shares</th>
                <th>Price</th>
                <th>Total Value</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDateTime(transaction.dateTime)}</td>
                    <td>{transaction.ticker}</td>
                    <td>{transaction.company}</td>
                    <td>
                      <span className={`ta-type-pill ${transaction.type}`}>
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td>{transaction.shares}</td>
                    <td>{formatCurrency(transaction.price)}</td>
                    <td>{formatCurrency(transaction.shares * transaction.price)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="ta-holdings-empty">
                    No recent transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
});
