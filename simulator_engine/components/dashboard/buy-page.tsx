"use client";

import { memo, useEffect, useMemo, useState } from "react";
import type { TradeDraft } from "@/components/dashboard/trade-modal";
import type { PortfolioHolding } from "@/components/dashboard/portfolio-overview";
import { getStockHistory, searchStocks, type ApiOHLCPoint, type ApiStock } from "@/lib/api";
import { EXCHANGE_OPTIONS, type ExchangeId } from "@/lib/exchanges";
const rangeOptions = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"] as const;
type RangeOption = (typeof rangeOptions)[number];

type BuyPageProps = {
  holdings?: PortfolioHolding[];
  onTradeAction: (trade: TradeDraft) => void;
  priceRefreshVersion?: number;
};

function formatCurrency(value: number | undefined, currency = "USD") {
  if (value === undefined) return "--";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(value: number | undefined, withPercent?: boolean) {
  if (value === undefined) return "--";
  const prefix = value > 0 ? "+" : "";
  return withPercent ? `${prefix}${value.toFixed(2)}%` : `${prefix}${value.toFixed(2)}`;
}

function formatChartDate(value: string | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatAxisDate(value: string | undefined, range: RangeOption) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  if (range === "1D") {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  } else if (range === "5D" || range === "1M") {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  } else if (range === "6M" || range === "YTD" || range === "1Y") {
    return new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  } else {
    return new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(date);
  }
}

function getSeriesByRange(series: ApiOHLCPoint[], range: RangeOption) {
  if (series.length === 0) return series;
  const lastDate = new Date(series[series.length - 1].date);
  const from = new Date(lastDate);
  if (range === "1D") from.setDate(lastDate.getDate() - 1);
  else if (range === "5D") from.setDate(lastDate.getDate() - 5);
  else if (range === "1M") from.setMonth(lastDate.getMonth() - 1);
  else if (range === "6M") from.setMonth(lastDate.getMonth() - 6);
  else if (range === "YTD") from.setMonth(0, 1);
  else if (range === "1Y") from.setFullYear(lastDate.getFullYear() - 1);
  else from.setFullYear(lastDate.getFullYear() - 5);
  return series.filter((point) => new Date(point.date) >= from);
}

function toChartPath(values: number[], width: number, height: number) {
  if (values.length === 0) return { path: "", min: 0, max: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const path = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return { path, min, max };
}

export const BuyPage = memo(function BuyPage({
  holdings,
  onTradeAction,
  priceRefreshVersion = 0,
}: BuyPageProps) {
  const [selectedExchange, setSelectedExchange] = useState<ExchangeId>("NSE");
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [activeRange, setActiveRange] = useState<RangeOption>("1Y");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [stocks, setStocks] = useState<ApiStock[]>([]);
  const [historySeries, setHistorySeries] = useState<ApiOHLCPoint[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadStocks = async () => {
      try {
        const results = await searchStocks({
          exchange: selectedExchange,
          q: query.trim() || undefined,
        });
        if (active) {
          setStocks(results);
          setSearchError(null);
        }
      } catch (error) {
        if (active) {
          setStocks([]);
          setSearchError(error instanceof Error ? error.message : "Stock search failed.");
        }
      }
    };
    const timeout = window.setTimeout(loadStocks, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [selectedExchange, query, priceRefreshVersion]);

  useEffect(() => {
    if (stocks.length === 0 || !query.trim()) {
      setSelectedSymbol("");
      return;
    }
    const hasCurrentSelection = stocks.some((stock) => stock.symbol === selectedSymbol);
    if (!hasCurrentSelection) {
      setSelectedSymbol("");
    }
  }, [selectedSymbol, stocks]);

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.symbol === selectedSymbol),
    [selectedSymbol, stocks],
  );
  const stockCurrency = selectedStock?.currency ?? "USD";

  useEffect(() => {
    let active = true;
    const loadHistory = async () => {
      if (!selectedStock?.symbol) {
        setHistorySeries([]);
        return;
      }
      try {
        const results = await getStockHistory({
          symbol: selectedStock.symbol,
          range: activeRange,
        });
        if (active) setHistorySeries(results);
      } catch {
        if (active) setHistorySeries([]);
      }
    };

    if (!selectedStock?.symbol) {
      setHistorySeries([]);
      return;
    }

    void loadHistory();
    const interval = window.setInterval(loadHistory, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedStock?.symbol, activeRange, priceRefreshVersion]);

  useEffect(() => {
    if (!selectedSymbol) {
      return;
    }

    let active = true;
    const refreshSelectedStock = async () => {
      try {
        const results = await searchStocks({
          exchange: selectedExchange,
          q: selectedSymbol,
        });
        if (active) {
          setStocks(results);
          setSearchError(null);
        }
      } catch {
        // Keep the currently selected stock visible if one refresh fails.
      }
    };

    const interval = window.setInterval(refreshSelectedStock, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedExchange, selectedSymbol, priceRefreshVersion]);

  const availableSellShares =
    holdings?.find((holding) => holding.ticker === selectedStock?.symbol)?.quantity ?? 0;
  const canSell = Boolean(selectedStock && availableSellShares > 0);
  const priceTone =
    selectedStock?.change === undefined
      ? "neutral"
      : selectedStock.change >= 0
        ? "positive"
        : "negative";

  const chartRangeSeries = useMemo(
    () => getSeriesByRange(historySeries, activeRange),
    [historySeries, activeRange],
  );
  const latestHistoryPoint = chartRangeSeries[chartRangeSeries.length - 1];
  const previousHistoryPoint =
    chartRangeSeries.length > 1 ? chartRangeSeries[chartRangeSeries.length - 2] : undefined;
  const { path: chartPath, min: chartMin, max: chartMax } = useMemo(() => {
    const chartCloses = chartRangeSeries.map((point) => point.close);
    return toChartPath(chartCloses, 940, 300);
  }, [chartRangeSeries]);

  const chartTail = chartRangeSeries[chartRangeSeries.length - 1]?.close ?? 0;
  const chartHead = chartRangeSeries[0]?.close ?? 0;
  const diff = chartTail - chartHead;
  const tone = diff >= 0 ? "positive" : "negative";

  const activePoint =
    hoverIndex !== null && chartRangeSeries[hoverIndex]
      ? chartRangeSeries[hoverIndex]
      : chartRangeSeries[chartRangeSeries.length - 1];
  const chartDate = formatChartDate(activePoint?.date);
  const chartTailPrice = activePoint?.close;
  const hoverX =
    hoverIndex !== null && chartRangeSeries.length > 1
      ? (hoverIndex / (chartRangeSeries.length - 1)) * 940
      : null;
  const hoverY =
    hoverIndex !== null && activePoint
      ? 300 -
      ((activePoint.close - chartMin) / Math.max(1, chartMax - chartMin)) *
      300
      : null;
  const prevCloseY =
    selectedStock?.prevClose !== undefined && chartMax > chartMin
      ? 300 - ((selectedStock.prevClose - chartMin) / (chartMax - chartMin)) * 300
      : null;

  const hoverXPct = hoverX !== null ? (hoverX / 940) * 100 : null;
  const hoverYPct = hoverY !== null ? (hoverY / 300) * 100 : null;
  const tooltipXPct = hoverXPct !== null ? Math.min(92, Math.max(8, hoverXPct + 2)) : null;
  const tooltipYPct = hoverYPct !== null ? Math.min(78, Math.max(8, hoverYPct - 10)) : null;

  const yTicks = useMemo(() => {
    if (chartRangeSeries.length === 0) return ["--", "--", "--", "--", "--"];
    const min = chartMin;
    const max = chartMax;
    const step = (max - min) / 4;
    return Array.from({ length: 5 }, (_, index) => (max - step * index).toFixed(0));
  }, [chartRangeSeries.length, chartMax, chartMin]);

  const xTicks = useMemo(() => {
    if (chartRangeSeries.length === 0) return ["--", "--", "--", "--", "--"];
    const idx = [0, 0.25, 0.5, 0.75, 1].map((factor) =>
      Math.min(chartRangeSeries.length - 1, Math.round((chartRangeSeries.length - 1) * factor)),
    );
    return idx.map((i) => formatAxisDate(chartRangeSeries[i]?.date, activeRange));
  }, [chartRangeSeries, activeRange]);

  return (
    <section className="ta-dashboard-content ta-buy-page">
      <h2 className="ta-buy-title">Buy Stocks</h2>

      <div className="ta-buy-search-card">
        <div className="ta-buy-search-row">
          <div className="ta-buy-select-wrap">
            <select
              className="ta-buy-select"
              value={selectedExchange}
              onChange={(event) => {
                setSelectedExchange(event.target.value as ExchangeId);
                setQuery("");
                setSelectedSymbol("");
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
          <div className="ta-buy-search-input-wrap">
            <span className="ta-buy-search-icon">⌕</span>
            <input
              className="ta-buy-search-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedSymbol("");
              }}
              placeholder="Search stock by symbol or company"
            />
            {query ? (
              <button
                type="button"
                className="ta-buy-search-clear"
                onClick={() => {
                  setQuery("");
                  setSelectedSymbol("");
                }}
                aria-label="Clear search"
              >
                x
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {query.trim() && !selectedSymbol ? (
        <div className="ta-watch-search-results">
          {stocks.length > 0 ? (
            stocks.slice(0, 12).map((stock) => (
              <button
                key={`${stock.exchange}-${stock.symbol}`}
                type="button"
                className="ta-watch-result-item"
                onClick={() => {
                  setSelectedSymbol(stock.symbol);
                  setQuery(stock.symbol);
                }}
              >
                <div>
                  <p className="ta-watch-preview-symbol">{stock.symbol}</p>
                  <p className="ta-watch-preview-name">{stock.companyName}</p>
                </div>
                <span className="ta-watch-result-exchange">{stock.exchange}</span>
              </button>
            ))
          ) : searchError ? (
            <p className="ta-market-watch-note">{searchError}</p>
          ) : (
            <p className="ta-market-watch-note">No matching stocks from backend.</p>
          )}
        </div>
      ) : null}

      {selectedStock ? (
        <div className="ta-buy-layout-grid">
          <article className="ta-buy-panel ta-buy-chart-panel">
            <h3 className="ta-buy-panel-title">Historical Performance</h3>
            <div className="ta-buy-chart-placeholder">
              {selectedStock ? (
                <div className="ta-buy-chart-live">
                  <div className="ta-charts-ranges">
                    {rangeOptions.map((range) => (
                      <button
                        key={range}
                        type="button"
                        className={`ta-charts-range-btn ${activeRange === range ? "active" : ""}`}
                        onClick={() => {
                          setActiveRange(range);
                          setHoverIndex(null);
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>

                  <div className="ta-charts-plot-wrap">
                    {hoverX !== null && hoverY !== null ? (
                      <>
                        <div className="ta-charts-crosshair ta-charts-crosshair-v" style={{ left: `${hoverXPct}%` }} />
                        <div className="ta-charts-crosshair ta-charts-crosshair-h" style={{ top: `${hoverYPct}%` }} />
                      </>
                    ) : null}

                    {hoverIndex !== null && tooltipXPct !== null && tooltipYPct !== null ? (
                    <div className="ta-charts-tooltip" style={{ left: `${tooltipXPct}%`, top: `${tooltipYPct}%` }}>
                      {formatCurrency(chartTailPrice, stockCurrency)} {chartDate}
                    </div>
                    ) : null}

                    <svg
                      viewBox="0 0 940 300"
                      className="ta-charts-plot"
                      role="img"
                      aria-label={`${selectedStock.symbol} historical performance`}
                      onMouseMove={(event) => {
                        if (chartRangeSeries.length < 2) return;
                        const bounds = event.currentTarget.getBoundingClientRect();
                        const x = event.clientX - bounds.left;
                        const ratio = Math.max(0, Math.min(1, x / bounds.width));
                        setHoverIndex(Math.round(ratio * (chartRangeSeries.length - 1)));
                      }}
                      onMouseLeave={() => setHoverIndex(null)}
                    >
                      <defs>
                        <linearGradient id="taBuyChartFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor={diff >= 0 ? "rgba(26,115,232,0.12)" : "rgba(230,64,54,0.12)"} />
                          <stop offset="100%" stopColor={diff >= 0 ? "rgba(26,115,232,0)" : "rgba(230,64,54,0)"} />
                        </linearGradient>
                      </defs>
                      {prevCloseY !== null && !isNaN(prevCloseY) ? (
                        <line
                          x1="0" y1={prevCloseY}
                          x2="940" y2={prevCloseY}
                          stroke="var(--border-secondary)"
                          strokeDasharray="4 4"
                          strokeWidth="1.5"
                        />
                      ) : null}
                      <path d={`${chartPath} L940,300 L0,300 Z`} fill="url(#taBuyChartFill)" />
                      <path d={chartPath} className={`ta-charts-line ${tone}`} />
                    </svg>
                    <div className="ta-charts-axis-y">
                      {yTicks.map((tick, index) => (
                        <span key={`${tick}-${index}`}>{tick}</span>
                      ))}
                    </div>
                    <div className="ta-charts-axis-x">
                      {xTicks.map((tick, index) => (
                        <span key={`${tick}-${index}`}>{tick}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ta-buy-chart-line" />
              )}
            </div>
          </article>

          <div className="ta-buy-side-column">
            <article className="ta-buy-panel ta-buy-actions-panel">
              <div className="ta-buy-actions-row">
                <button
                  type="button"
                  className="ta-buy-action-btn ta-trade-pill buy"
                  disabled={!selectedStock}
                  onClick={() => {
                    if (!selectedStock?.currentPrice) return;
                    onTradeAction({
                      ticker: selectedStock.symbol,
                      company: selectedStock.companyName,
                      exchange: selectedStock.exchange,
                      price: selectedStock.currentPrice,
                      type: "buy",
                    });
                  }}
                >
                  Buy
                </button>
                <button
                  type="button"
                  className="ta-buy-action-btn ta-trade-pill sell"
                  disabled={!canSell}
                  onClick={() => {
                    if (!selectedStock?.currentPrice) return;
                    onTradeAction({
                      ticker: selectedStock.symbol,
                      company: selectedStock.companyName,
                      exchange: selectedStock.exchange,
                      price: selectedStock.currentPrice,
                      type: "sell",
                      maxShares: availableSellShares,
                    });
                  }}
                >
                  Sell
                </button>
              </div>
            </article>

            <article className="ta-buy-panel ta-buy-stats-panel">
              <h3 className="ta-buy-panel-title">Key Statistics</h3>
              <div className="ta-buy-stats-grid">
                <p>Open</p>
                <p>{formatCurrency(latestHistoryPoint?.open, stockCurrency)}</p>
                <p>High</p>
                <p>{formatCurrency(latestHistoryPoint?.high, stockCurrency)}</p>
                <p>Low</p>
                <p>{formatCurrency(latestHistoryPoint?.low, stockCurrency)}</p>
                <p>Close</p>
                <p>{formatCurrency(latestHistoryPoint?.close, stockCurrency)}</p>
                <p>Previous Close</p>
                <p>{formatCurrency(previousHistoryPoint?.close ?? selectedStock?.prevClose, stockCurrency)}</p>
                <p>Volume</p>
                <p>
                  {latestHistoryPoint?.volume
                    ? new Intl.NumberFormat("en-US").format(latestHistoryPoint.volume)
                    : "--"}
                </p>
                <p>Avg Volatility</p>
                <p>{selectedStock?.avgVolatility?.toFixed(2) ?? "--"}</p>
                <p>52-Week High</p>
                <p>{formatCurrency(selectedStock?.fiftyTwoWeekHigh, stockCurrency)}</p>
                <p>52-Week Low</p>
                <p>{formatCurrency(selectedStock?.fiftyTwoWeekLow, stockCurrency)}</p>
                <p>Sector</p>
                <p>{selectedStock?.sector ?? "--"}</p>
                <p>Industry</p>
                <p>{selectedStock?.industry ?? "--"}</p>
              </div>
            </article>
          </div>
        </div>
      ) : null}

    </section>
  );
});
