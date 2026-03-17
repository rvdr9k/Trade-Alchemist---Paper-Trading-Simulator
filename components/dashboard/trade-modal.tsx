"use client";

import { useMemo, useState } from "react";
import type { TransactionType } from "@/components/dashboard/transaction-history-table";

export type TradeDraft = {
  ticker: string;
  company: string;
  exchange?: string;
  price: number;
  type: TransactionType;
  maxShares?: number;
};

type TradeModalProps = {
  trade: TradeDraft;
  onCancel: () => void;
  onConfirm: (shares: number) => void | Promise<void>;
  message?: string | null;
};

const feeRate = 0.02;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function TradeModal({ trade, onCancel, onConfirm, message }: TradeModalProps) {
  const defaultShares = trade.type === "sell" ? Math.min(trade.maxShares ?? 5, 5) : 1;
  const [shares, setShares] = useState<number>(defaultShares);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeShares = Number.isFinite(shares) && shares > 0 ? shares : 0;

  const gross = useMemo(() => safeShares * trade.price, [safeShares, trade.price]);
  const feeAmount = useMemo(
    () => (trade.type === "sell" ? Math.abs(gross * feeRate) : 0),
    [gross, trade.type],
  );
  const netAmount = useMemo(
    () => (trade.type === "sell" ? gross + feeAmount : gross),
    [gross, feeAmount, trade.type],
  );

  const handleConfirm = async () => {
    if (safeShares < 1) {
      setError("Enter at least 1 share.");
      return;
    }
    if (trade.type === "sell" && trade.maxShares !== undefined && safeShares > trade.maxShares) {
      setError(`You can sell up to ${trade.maxShares} shares.`);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(safeShares);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ta-modal-backdrop" role="dialog" aria-modal="true">
      <div className="ta-trade-modal">
        <button type="button" className="ta-trade-modal-close" onClick={onCancel} aria-label="Close trade modal">
          x
        </button>

        <h3 className="ta-trade-modal-title">
          {trade.type === "buy" ? "Buy" : "Sell"} {trade.ticker}
        </h3>
        <p className="ta-trade-modal-subtitle">
          {trade.type === "sell" && trade.maxShares !== undefined
            ? `You currently own ${trade.maxShares} shares. `
            : ""}
          Current price is {formatCurrency(trade.price)}.
        </p>

        <div className="ta-trade-shares-row">
          <label htmlFor="trade-shares" className="ta-trade-shares-label">
            Shares
          </label>
          <div className="ta-trade-shares-input-wrap">
            <input
              id="trade-shares"
              type="number"
              min={1}
              max={trade.maxShares}
              value={shares}
              onChange={(event) => {
                setShares(Number(event.target.value));
                setError(null);
              }}
            />
            {trade.maxShares ? (
              <button type="button" onClick={() => setShares(trade.maxShares ?? 1)}>
                Max
              </button>
            ) : null}
          </div>
        </div>
        {error ? <p className="ta-error">{error}</p> : null}
        {!error && message ? <p className="ta-error">{message}</p> : null}

        <div className="ta-trade-summary">
          {trade.type === "sell" ? (
            <p>
              <span>Est. Gross Proceeds:</span>
              <strong>{formatCurrency(gross)}</strong>
            </p>
          ) : null}
          {trade.type === "sell" ? (
            <p>
              <span>Platform Fee (2%):</span>
              <strong className="negative">+{formatCurrency(feeAmount)}</strong>
            </p>
          ) : null}
          <p className="net">
            <span>{trade.type === "sell" ? "Est. Net Credit" : "Est. Net Debit"}:</span>
            <strong>{formatCurrency(netAmount)}</strong>
          </p>
        </div>

        <div className="ta-trade-modal-actions">
          <button type="button" className="ta-trade-link-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`ta-trade-submit-btn ta-trade-pill ${trade.type}`}
            onClick={handleConfirm}
            disabled={safeShares < 1 || isSubmitting}
          >
            {isSubmitting
              ? "Processing..."
              : `${trade.type === "buy" ? "Buy" : "Sell"} ${safeShares} Shares`}
          </button>
        </div>
      </div>
    </div>
  );
}
