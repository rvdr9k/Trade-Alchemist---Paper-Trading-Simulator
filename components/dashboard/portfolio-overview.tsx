import { memo } from "react";

export type PortfolioMetrics = {
  totalPortfolioValue?: number;
  investmentValue?: number;
  unrealisedPL?: number;
  todaysPL?: number;
  buyingPower?: number;
};

export type PortfolioHolding = {
  ticker: string;
  companyName?: string;
  exchange?: string;
  displayName?: string;
  quantity?: number;
  currentPrice?: number;
  holdPrice?: number;
  totalPL?: number;
};

type PortfolioOverviewProps = {
  metrics?: PortfolioMetrics;
  holdings?: PortfolioHolding[];
};

const portfolioFields: Array<{ key: keyof PortfolioMetrics; label: string }> = [
  { key: "totalPortfolioValue", label: "Total Portfolio Value" },
  { key: "investmentValue", label: "Investment Value" },
  { key: "unrealisedPL", label: "Unrealised P/L" },
  { key: "todaysPL", label: "Today's P/L" },
  { key: "buyingPower", label: "Buying Power" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function getValueTone(value: number | undefined) {
  if (value === undefined) {
    return "neutral";
  }
  if (value > 0) {
    return "positive";
  }
  if (value < 0) {
    return "negative";
  }
  return "neutral";
}

export const PortfolioOverview = memo(function PortfolioOverview({
  metrics,
  holdings,
}: PortfolioOverviewProps) {
  return (
    <section className="ta-dashboard-content">
      <h2>Portfolio</h2>

      <div className="ta-portfolio-grid">
        {portfolioFields.map((field) => {
          const value = metrics?.[field.key];
          const tone = getValueTone(value);
          const displayValue = value === undefined ? "--" : formatCurrency(value);

          return (
            <article key={field.key} className="ta-portfolio-card">
              <p className="ta-portfolio-label">{field.label}</p>
              <p className={`ta-portfolio-value ${tone}`}>{displayValue}</p>
            </article>
          );
        })}
      </div>

      <div className="ta-holdings-wrap">
        <h3 className="ta-holdings-title">All Holdings</h3>
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
              {holdings && holdings.length > 0 ? (
                holdings.map((holding) => {
                  const plTone = getValueTone(holding.totalPL);
                  return (
                    <tr key={holding.ticker}>
                      <td>
                        <p className="ta-holding-ticker">{holding.ticker}</p>
                        <p className="ta-holding-qty">Qty: {holding.quantity ?? "--"}</p>
                      </td>
                      <td>{holding.currentPrice === undefined ? "--" : formatCurrency(holding.currentPrice)}</td>
                      <td>{holding.holdPrice === undefined ? "--" : formatCurrency(holding.holdPrice)}</td>
                      <td className={`ta-portfolio-value ${plTone}`}>
                        {holding.totalPL === undefined ? "--" : formatCurrency(holding.totalPL)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="ta-holdings-empty">
                    Holdings will appear once trading data is connected. When backend is ready, pass a real holdings array and values will render automatically.
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
