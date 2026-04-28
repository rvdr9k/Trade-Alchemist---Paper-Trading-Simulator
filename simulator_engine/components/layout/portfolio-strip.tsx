"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PORTFOLIO_SNAPSHOT,
  PORTFOLIO_EVENT,
  PORTFOLIO_STORAGE_KEY,
  readPortfolioSnapshot,
  type PortfolioSnapshot,
} from "@/lib/portfolio-store";

const stripFields: Array<{ key: keyof PortfolioSnapshot; label: string }> = [
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

function getTone(value: number) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function PortfolioStrip() {
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot>(DEFAULT_PORTFOLIO_SNAPSHOT);

  useEffect(() => {
    setSnapshot(readPortfolioSnapshot());

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== PORTFOLIO_STORAGE_KEY) {
        return;
      }
      setSnapshot(readPortfolioSnapshot());
    };

    const handleSnapshot = (event: Event) => {
      const custom = event as CustomEvent<PortfolioSnapshot>;
      if (custom.detail) {
        setSnapshot(custom.detail);
        return;
      }
      setSnapshot(readPortfolioSnapshot());
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(PORTFOLIO_EVENT, handleSnapshot as EventListener);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(PORTFOLIO_EVENT, handleSnapshot as EventListener);
    };
  }, []);

  return (
    <aside className="ta-fixed-strip" aria-label="Portfolio summary strip">
      <div className="ta-fixed-strip-inner">
        {stripFields.map((field) => (
          <article key={field.key} className="ta-fixed-strip-item">
            <p className="ta-fixed-strip-label">{field.label}</p>
            <p className={`ta-fixed-strip-value ${getTone(snapshot[field.key])}`}>
              {formatCurrency(snapshot[field.key])}
            </p>
          </article>
        ))}
      </div>
    </aside>
  );
}
