import { memo } from "react";
import type { PortfolioHolding } from "@/components/dashboard/portfolio-overview";
import type { TradeDraft } from "@/components/dashboard/trade-modal";

type SellPageProps = {
  holdings?: PortfolioHolding[];
  onTradeAction: (trade: TradeDraft) => void;
};

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

function getValueTone(value: number | undefined) {
  if (value === undefined || value === 0) {
    return "neutral";
  }
  return value > 0 ? "positive" : "negative";
}

export const SellPage = memo(function SellPage({ holdings, onTradeAction }: SellPageProps) {
  return (
    <section className="ta-dashboard-content ta-sell-page">
      <h2>Sell</h2>

      <div className="ta-holdings-table-wrap">
        <table className="ta-holdings-table">
          <thead>
            <tr>
              <th>Stock</th>
              <th>Qty</th>
              <th>Current Price</th>
              <th>Hold Price</th>
              <th>Total P/L</th>
              <th>Trade</th>
            </tr>
          </thead>
          <tbody>
            {holdings && holdings.length > 0 ? (
              holdings.map((holding) => {
                const tone = getValueTone(holding.totalPL);
                const canSell = Boolean(holding.currentPrice) && Boolean(holding.quantity);

                return (
                  <tr key={holding.ticker}>
                    <td>
                      <p className="ta-holding-ticker">{holding.ticker}</p>
                      <p className="ta-holding-qty">Qty: {holding.quantity ?? "--"}</p>
                    </td>
                    <td>{holding.quantity ?? "--"}</td>
                    <td>{formatCurrency(holding.currentPrice)}</td>
                    <td>{formatCurrency(holding.holdPrice)}</td>
                    <td className={`ta-portfolio-value ${tone}`}>
                      {holding.totalPL === undefined ? "--" : formatCurrency(holding.totalPL)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ta-type-pill ta-type-pill-btn sell ta-sell-pill-btn"
                        disabled={!canSell}
                        onClick={() => {
                          if (!holding.currentPrice) {
                            return;
                          }
                          onTradeAction({
                            ticker: holding.ticker,
                            company: holding.companyName ?? holding.ticker,
                            exchange: holding.exchange,
                            price: holding.currentPrice,
                            type: "sell",
                            maxShares: holding.quantity,
                          });
                        }}
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="ta-holdings-empty">
                  No holdings available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
});
