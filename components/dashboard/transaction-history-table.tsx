import { memo } from "react";

export type TransactionType = "buy" | "sell";

export type TransactionRecord = {
  id: string;
  dateTime: string;
  ticker: string;
  company: string;
  type: TransactionType;
  shares: number;
  price: number;
};

type TransactionHistoryTableProps = {
  transactions: TransactionRecord[];
};

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export const TransactionHistoryTable = memo(function TransactionHistoryTable({
  transactions,
}: TransactionHistoryTableProps) {
  return (
    <section className="ta-dashboard-content">
      <h2>Transaction History</h2>
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
            {transactions.length > 0 ? (
              transactions.map((transaction) => {
                const totalValue = transaction.shares * transaction.price;

                return (
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
                    <td>{formatCurrency(totalValue)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="ta-holdings-empty">
                  No transactions available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
});
