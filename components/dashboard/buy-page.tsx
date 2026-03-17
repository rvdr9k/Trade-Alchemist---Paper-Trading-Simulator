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

function formatAxisDate(value: string | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", { year: "numeric" }).format(date);
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

export const BuyPage = memo(function BuyPage({ holdings, onTradeAction }: BuyPageProps) {
  const [selectedExchange, setSelectedExchange] = useState<ExchangeId>("NSE");
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [activeRange, setActiveRange] = useState<RangeOption>("1Y");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [stocks, setStocks] = useState<ApiStock[]>([]);
  const [historySeries, setHistorySeries] = useState<ApiOHLCPoint[]>([]);

  useEffect(() => {
    let active = true;
    const loadStocks = async () => {
      try {
        const results = await searchStocks({
          exchange: selectedExchange,
          q: query.trim() || undefined,
        });
        if (active) setStocks(results);
      } catch {
        if (active) setStocks([]);
      }
    };
    const timeout = window.setTimeout(loadStocks, 250);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [selectedExchange, query]);

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
    void loadHistory();
    return () => {
      active = false;
    };
  }, [selectedStock?.symbol, activeRange]);

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
  const chartValues = chartRangeSeries.map((point) => point.close);
  const chartGeometry = toChartPath(chartValues, 940, 300);
  const chartPath = chartGeometry.path;
  const activePoint =
    hoverIndex !== null && chartRangeSeries[hoverIndex]
      ? chartRangeSeries[hoverIndex]
      : chartRangeSeries[chartRangeSeries.length - 1];
  const chartDate = formatChartDate(activePoint?.date);
  const chartTail = activePoint?.close;
  const hoverX =
    hoverIndex !== null && chartRangeSeries.length > 1
      ? (hoverIndex / (chartRangeSeries.length - 1)) * 940
      : null;
  const hoverY =
    hoverIndex !== null && activePoint
      ? 300 -
        ((activePoint.close - chartGeometry.min) / Math.max(1, chartGeometry.max - chartGeometry.min)) *
          300
      : null;
  const hoverXPct = hoverX !== null ? (hoverX / 940) * 100 : null;
  const hoverYPct = hoverY !== null ? (hoverY / 300) * 100 : null;
  const tooltipXPct = hoverXPct !== null ? Math.min(92, Math.max(8, hoverXPct + 2)) : 78;
  const tooltipYPct = hoverYPct !== null ? Math.min(78, Math.max(8, hoverYPct - 10)) : 12;

  const yTicks = useMemo(() => {
    if (chartValues.length === 0) return ["--", "--", "--", "--", "--"];
    const min = chartGeometry.min;
    const max = chartGeometry.max;
    const step = (max - min) / 4;
    return Array.from({ length: 5 }, (_, index) => (max - step * index).toFixed(0));
  }, [chartValues, chartGeometry.max, chartGeometry.min]);

  const xTicks = useMemo(() => {
    if (chartRangeSeries.length === 0) return ["--", "--", "--", "--", "--"];
    const idx = [0, 0.25, 0.5, 0.75, 1].map((factor) =>
      Math.min(chartRangeSeries.length - 1, Math.round((chartRangeSeries.length - 1) * factor)),
    );
    return idx.map((i) => formatAxisDate(chartRangeSeries[i]?.date));
  }, [chartRangeSeries]);

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
                  <p className="ta-watch-preview-name">
                    {stock.companyName} ({stock.exchange})
                  </p>
                </div>
              </button>
            ))
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

                  <div className="ta-charts-tooltip" style={{ left: `${tooltipXPct}%`, top: `${tooltipYPct}%` }}>
                    {formatCurrency(chartTail, stockCurrency)} {chartDate}
                  </div>

                  <svg
                    viewBox="0 0 940 300"
                    className="ta-buy-chart-svg"
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
                        <stop offset="0%" stopColor="rgba(22,163,74,0.40)" />
                        <stop offset="100%" stopColor="rgba(22,163,74,0.05)" />
                      </linearGradient>
                    </defs>
                    <path d={`${chartPath} L940,300 L0,300 Z`} fill="url(#taBuyChartFill)" />
                    <path d={chartPath} className="ta-buy-chart-line-path ta-charts-line" />
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
              <p>{formatCurrency(selectedStock?.open, stockCurrency)}</p>
              <p>High</p>
              <p>{formatCurrency(selectedStock?.high, stockCurrency)}</p>
              <p>Low</p>
              <p>{formatCurrency(selectedStock?.low, stockCurrency)}</p>
              <p>Close</p>
              <p>{formatCurrency(selectedStock?.close, stockCurrency)}</p>
              <p>Previous Close</p>
              <p>{formatCurrency(selectedStock?.prevClose, stockCurrency)}</p>
              <p>Volume</p>
              <p>{selectedStock?.volume ? new Intl.NumberFormat("en-US").format(selectedStock.volume) : "--"}</p>
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
