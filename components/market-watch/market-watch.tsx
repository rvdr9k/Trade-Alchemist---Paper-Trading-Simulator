"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { TradeDraft } from "@/components/dashboard/trade-modal";
import type { PortfolioHolding } from "@/components/dashboard/portfolio-overview";
import { searchStocks, type ApiStock, type ApiWatchlistItem } from "@/lib/api";
import { EXCHANGE_OPTIONS, type ExchangeId } from "@/lib/exchanges";

type MarketWatchProps = {
  isDarkMode: boolean;
  holdings?: PortfolioHolding[];
  watchlist: ApiWatchlistItem[];
  onTradeAction: (trade: TradeDraft) => void;
  onAddWatchlist: (item: ApiWatchlistItem) => Promise<void>;
  onRemoveWatchlist: (item: ApiWatchlistItem) => Promise<void>;
  priceRefreshVersion?: number;
};

export const MarketWatch = memo(function MarketWatch({
  isDarkMode,
  holdings,
  watchlist,
  onTradeAction,
  onAddWatchlist,
  onRemoveWatchlist,
  priceRefreshVersion = 0,
}: MarketWatchProps) {
  const [selectedExchange, setSelectedExchange] = useState<ExchangeId>("NSE");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiStock[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadStocks = async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }
      try {
        const results = await searchStocks({
          exchange: selectedExchange,
          q: trimmed,
        });
        if (!active) {
          return;
        }
        setSearchResults(results);
        setSearchError(null);
      } catch (error) {
        if (!active) {
          return;
        }
        setSearchResults([]);
        setSearchError(error instanceof Error ? error.message : "Stock search failed.");
      }
    };
    const timeout = window.setTimeout(loadStocks, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, selectedExchange, priceRefreshVersion]);

  const filteredStocks = useMemo(() => {
    return searchResults.filter((stock) => stock.symbol && stock.companyName);
  }, [searchResults]);

  return (
    <section className="ta-dashboard-content">
      <div className="ta-market-watch-new">

        <h2 className="ta-watch-main-title">Market Watch</h2>

        <div className="ta-watch-search-card">
          <div className="ta-buy-search-row">
            <div className="ta-buy-select-wrap">
              <select
                className="ta-buy-select"
                value={selectedExchange}
                onChange={(event) => {
                  setSelectedExchange(event.target.value as ExchangeId);
                  setQuery("");
                }}
              >
                {EXCHANGE_OPTIONS.map((exchange) => (
                  <option key={exchange.id} value={exchange.id}>
                    {exchange.label}
                  </option>
                ))}
              </select>
              <span className="ta-buy-select-arrow">▾</span>
            </div>
            <div className="ta-watch-search-input-wrap">
              <span className="ta-watch-search-icon">⌕</span>

              <input
                className="ta-watch-search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ticker to watch..."
              />

              {query ? (
                <button
                  type="button"
                  className="ta-watch-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  x
                </button>
              ) : null}
            </div>
          </div>
        </div>



        {query.trim() ? (
          <div className="ta-watch-search-results">
            {filteredStocks.length > 0 ? (
              filteredStocks.map((stock) => (
                <article key={`${stock.exchange}-${stock.symbol}`} className="ta-watch-result-item">
                  <div>
                    <p className="ta-watch-preview-symbol">{stock.symbol}</p>
                    <p className="ta-watch-preview-name">
                      {stock.companyName} ({stock.exchange})
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ta-watch-add-btn"
                    onClick={() =>
                      onAddWatchlist({
                        ticker: stock.symbol,
                        companyName: stock.companyName,
                        exchange: stock.exchange,
                      })
                    }
                  >
                    +
                  </button>
                </article>
              ))
            ) : searchError ? (
              <p className="ta-market-watch-note">
                {searchError}
              </p>
            ) : (
              <p className="ta-market-watch-note">
                No matching stocks found. 
              </p>
            )}
          </div>
        ) : null}

        <div className="ta-holdings-table-wrap">
          <table className="ta-holdings-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company Name</th>
                <th>Exchange</th>
                <th>Last Price</th>
                <th>Current Price</th>
                <th>Change</th>
                <th>% Change</th>
                <th>Open</th>
                <th>Day High</th>
                <th>Day Low</th>
                <th>Volume</th>
                <th>Trade</th>
                <th>Delete</th>

              </tr>
            </thead>
            <tbody>
              {watchlist.length > 0 ? (
                watchlist.map((stock) => {
                  const availableShares =
                    holdings?.find((holding) => holding.ticker === stock.ticker)?.quantity ?? 0;
                  const canSell = availableShares > 0;

                  return (
                  <tr key={`${stock.exchange}-${stock.ticker}`}>
                    <td>{stock.ticker}</td>
                    <td>{stock.companyName}</td>
                    <td>{stock.exchange}</td>

                    <td>{stock.prevClose?.toFixed(2) ?? "--"}</td>

                    <td className={(stock.currentPrice ?? 0) >= (stock.open ?? 0) ? "positive" : "negative"}>
                      {stock.currentPrice?.toFixed(2) ?? "--"}
                    </td>

                    <td className={(stock.change ?? 0) >= 0 ? "positive" : "negative"}>
                      {(stock.change ?? 0) >= 0 ? "▲" : "▼"} {stock.change?.toFixed(2) ?? "--"}
                    </td>

                    <td className={(stock.percentChange ?? 0) >= 0 ? "positive" : "negative"}>
                      {(stock.percentChange ?? 0) >= 0 ? "+" : ""}
                      {stock.percentChange?.toFixed(2) ?? "--"}%
                    </td>

                    <td>{stock.open?.toFixed(2) ?? "--"}</td>
                    <td>{stock.high?.toFixed(2) ?? "--"}</td>
                    <td>{stock.low?.toFixed(2) ?? "--"}</td>
                    <td>{stock.volume?.toLocaleString() ?? "--"}</td>

                    <td>
                      <div className="ta-trade-cell">
                        <button
                          type="button"
                          className="ta-type-pill ta-type-pill-btn buy"
                          onClick={() =>
                            onTradeAction({
                              ticker: stock.ticker,
                              company: stock.companyName,
                              exchange: stock.exchange,
                              price: stock.currentPrice ?? 0,
                              type: "buy",
                            })
                          }
                          disabled={!stock.currentPrice}
                        >
                          Buy
                        </button>
                        <button
                          type="button"
                          className="ta-type-pill ta-type-pill-btn sell"
                          disabled={!canSell}
                          onClick={() =>
                            onTradeAction({
                              ticker: stock.ticker,
                              company: stock.companyName,
                              exchange: stock.exchange,
                              price: stock.currentPrice ?? 0,
                              type: "sell",
                              maxShares: availableShares,
                            })
                          }
                        >
                          Sell
                        </button>
                      </div>
                    </td>

                    {/* DELETE BUTTON */}
                    <td>
                      <button
                        type="button"
                        className="ta-delete-icon"
                        onClick={() => onRemoveWatchlist(stock)}
                      >
                        <img
                          src={isDarkMode ? "/bin-dark.png" : "/bin-light.png"}
                          alt="Delete"
                          width={18}
                          height={18}
                        />
                      </button>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="ta-holdings-empty">
                    No stocks in watchlist yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
});
