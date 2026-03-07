export type PortfolioSnapshot = {
  totalPortfolioValue: number;
  investmentValue: number;
  unrealisedPL: number;
  todaysPL: number;
  buyingPower: number;
};

export const INITIAL_BUYING_POWER = 100000;
export const PORTFOLIO_STORAGE_KEY = "ta_portfolio_snapshot";
export const PORTFOLIO_EVENT = "ta:portfolio-snapshot";

export const DEFAULT_PORTFOLIO_SNAPSHOT: PortfolioSnapshot = {
  totalPortfolioValue: INITIAL_BUYING_POWER,
  investmentValue: 0,
  unrealisedPL: 0,
  todaysPL: 0,
  buyingPower: INITIAL_BUYING_POWER,
};

export function publishPortfolioSnapshot(snapshot: PortfolioSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(
    new CustomEvent(PORTFOLIO_EVENT, {
      detail: snapshot,
    }),
  );
}

export function readPortfolioSnapshot(): PortfolioSnapshot {
  if (typeof window === "undefined") {
    return DEFAULT_PORTFOLIO_SNAPSHOT;
  }

  const raw = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_PORTFOLIO_SNAPSHOT;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PortfolioSnapshot>;
    return {
      totalPortfolioValue:
        typeof parsed.totalPortfolioValue === "number"
          ? parsed.totalPortfolioValue
          : DEFAULT_PORTFOLIO_SNAPSHOT.totalPortfolioValue,
      investmentValue:
        typeof parsed.investmentValue === "number"
          ? parsed.investmentValue
          : DEFAULT_PORTFOLIO_SNAPSHOT.investmentValue,
      unrealisedPL:
        typeof parsed.unrealisedPL === "number"
          ? parsed.unrealisedPL
          : DEFAULT_PORTFOLIO_SNAPSHOT.unrealisedPL,
      todaysPL:
        typeof parsed.todaysPL === "number"
          ? parsed.todaysPL
          : DEFAULT_PORTFOLIO_SNAPSHOT.todaysPL,
      buyingPower:
        typeof parsed.buyingPower === "number"
          ? parsed.buyingPower
          : DEFAULT_PORTFOLIO_SNAPSHOT.buyingPower,
    };
  } catch {
    return DEFAULT_PORTFOLIO_SNAPSHOT;
  }
}
