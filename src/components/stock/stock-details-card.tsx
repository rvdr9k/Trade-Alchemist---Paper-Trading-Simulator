
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StockData } from "@/lib/types";

export function StockDetailsCard({ stock }: { stock: StockData }) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

  const formatNumber = (value: number) => {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    return value.toString();
  };

  const details = [
    { label: "Market Cap", value: formatNumber(stock.marketCap) },
    { label: "P/E Ratio", value: stock.peRatio?.toFixed(2) ?? "N/A" },
    { label: "Dividend Yield", value: stock.dividendYield ? `${stock.dividendYield.toFixed(2)}%` : "N/A" },
    { label: "52-Week High", value: formatCurrency(stock.fiftyTwoWeekHigh) },
    { label: "52-Week Low", value: formatCurrency(stock.fiftyTwoWeekLow) },
    { label: "Avg. Volume", value: formatNumber(stock.avgVolume) },
    { label: "Sector", value: stock.sector },
    { label: "Industry", value: stock.industry },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Key Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3">
          {details.map((detail) => (
            <li
              key={detail.label}
              className="flex items-center justify-between"
            >
              <span className="text-muted-foreground">{detail.label}</span>
              <span className="font-medium text-right">{detail.value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
