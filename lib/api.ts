import { getExchangeCode } from "@/lib/exchanges";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:8000";

export type BackendHealth = {
  ok: boolean;
  source: "health" | "root" | "none";
  message?: string;
};

export type ApiStock = {
  symbol: string;
  companyName: string;
  exchange: string;
  sector?: string;
  industry?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  numRows?: number;
  lastClose?: number;
  avgVolatility?: number;
  minClose?: number;
  maxClose?: number;
  medianClose?: number;
  stdDevClose?: number;
  avgVolume?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  currentPrice?: number;
  change?: number;
  percentChange?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  prevClose?: number;
  volume?: number;
};

export type ApiOHLCPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ApiUserProfile = {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiPortfolio = {
  uid: string;
  displayName?: string;
  buyingPower: number;
  totalPortfolioValue: number;
  investmentValue: number;
  unrealisedPL: number;
  todaysPL: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthenticatedMe = {
  auth: Record<string, unknown>;
  user: ApiUserProfile | null;
  portfolio: ApiPortfolio | null;
};

export type InitCurrentUserResponse = {
  status: string;
  created?: {
    user: boolean;
    portfolio: boolean;
  };
  user: ApiUserProfile | null;
  portfolio: ApiPortfolio | null;
};

export type ApiHolding = {
  uid?: string;
  displayName?: string;
  ticker: string;
  companyName?: string;
  exchange?: string;
  quantity?: number;
  currentPrice?: number;
  holdPrice?: number;
  totalPL?: number;
  updatedAt?: string;
};

export type ApiWatchlistItem = {
  uid?: string;
  displayName?: string;
  ticker: string;
  companyName: string;
  exchange: string;
  currentPrice?: number;
  prevClose?: number;
  change?: number;
  percentChange?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  updatedAt?: string;
  createdAt?: string;
};

export type ApiTransaction = {
  id: string;
  uid?: string;
  ticker: string;
  company: string;
  exchange?: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  totalValue?: number;
  dateTime: string;
};

export type ExecuteTradeRequest = {
  symbol: string;
  exchange: string;
  quantity: number;
};

async function fetchJson(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

async function fetchAuthenticatedJson(path: string, token: string, method: "GET" | "POST" = "GET") {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (typeof payload.message === "string") {
        message = payload.message;
      }
    } catch {
      // Ignore JSON parse failures and keep the HTTP status message.
    }
    throw new Error(message);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

async function fetchAuthenticatedJsonWithBody(
  path: string,
  token: string,
  method: "POST",
  body: Record<string, unknown>,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (typeof payload.message === "string") {
        message = payload.message;
      }
    } catch {
      // Ignore JSON parse failures and keep the HTTP status message.
    }
    throw new Error(message);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

function asNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getArrayPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }
  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    if (Array.isArray(candidate.data)) return candidate.data as Record<string, unknown>[];
    if (Array.isArray(candidate.results)) return candidate.results as Record<string, unknown>[];
    if (Array.isArray(candidate.stocks)) return candidate.stocks as Record<string, unknown>[];
    if (Array.isArray(candidate.items)) return candidate.items as Record<string, unknown>[];
    if (Array.isArray(candidate.history)) return candidate.history as Record<string, unknown>[];
  }
  return [];
}

function normalizeStockItem(item: Record<string, unknown>): ApiStock | null {
  const symbol =
    asString(item.symbol) ??
    asString(item.ticker) ??
    asString(item.code) ??
    asString(item.stock_symbol);
  const companyName =
    asString(item.companyName) ??
    asString(item.company_name) ??
    asString(item.company) ??
    asString(item.name) ??
    asString(item.longName) ??
    symbol;
  const exchange =
    asString(item.exchange) ??
    asString(item.market) ??
    asString(item.exch) ??
    asString(item.market_name) ??
    "";

  if (!symbol) {
    return null;
  }

  return {
    symbol,
    companyName: companyName ?? symbol,
    exchange,
    sector: asString(item.sector),
    industry: asString(item.industry),
    currency: asString(item.currency),
    startDate: asString(item.startDate) ?? asString(item.start_date),
    endDate: asString(item.endDate) ?? asString(item.end_date),
    numRows: asNumber(item.numRows) ?? asNumber(item.num_rows),
    lastClose: asNumber(item.lastClose) ?? asNumber(item.last_close),
    avgVolatility: asNumber(item.avgVolatility) ?? asNumber(item.avg_volatility),
    minClose: asNumber(item.minClose) ?? asNumber(item.min_close),
    maxClose: asNumber(item.maxClose) ?? asNumber(item.max_close),
    medianClose: asNumber(item.medianClose) ?? asNumber(item.median_close),
    stdDevClose: asNumber(item.stdDevClose) ?? asNumber(item.std_dev_close),
    avgVolume: asNumber(item.avgVolume) ?? asNumber(item.avg_volume),
    fiftyTwoWeekHigh: asNumber(item.fiftyTwoWeekHigh) ?? asNumber(item.fifty_two_week_high),
    fiftyTwoWeekLow: asNumber(item.fiftyTwoWeekLow) ?? asNumber(item.fifty_two_week_low),
    currentPrice:
      asNumber(item.currentPrice) ??
      asNumber(item.price) ??
      asNumber(item.lastPrice) ??
      asNumber(item.last_price) ??
      asNumber(item.close),
    change: asNumber(item.change),
    percentChange:
      asNumber(item.percentChange) ??
      asNumber(item.changePercent) ??
      asNumber(item.pctChange),
    open: asNumber(item.open),
    high: asNumber(item.high),
    low: asNumber(item.low),
    close: asNumber(item.close),
    prevClose: asNumber(item.prevClose) ?? asNumber(item.previousClose),
    volume: asNumber(item.volume),
  };
}

function normalizeHistoryItem(item: Record<string, unknown>): ApiOHLCPoint | null {
  const tupleValue = (field: "Date" | "Open" | "High" | "Low" | "Close" | "Volume") => {
    const key = Object.keys(item).find((k) => k.includes(`('${field}',`));
    return key ? item[key] : undefined;
  };

  const dateRaw =
    asString(item.date) ??
    asString(item.timestamp) ??
    asString(item.datetime) ??
    asString(tupleValue("Date"));
  const open =
    asNumber(item.open) ??
    asNumber(tupleValue("Open"));
  const high =
    asNumber(item.high) ??
    asNumber(tupleValue("High"));
  const low =
    asNumber(item.low) ??
    asNumber(tupleValue("Low"));
  const close =
    asNumber(item.close) ??
    asNumber(item.price) ??
    asNumber(tupleValue("Close"));
  const volume =
    asNumber(item.volume) ??
    asNumber(tupleValue("Volume"));

  if (!dateRaw || open === undefined || high === undefined || low === undefined || close === undefined || volume === undefined) {
    return null;
  }

  const date = new Date(dateRaw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return { date: date.toISOString(), open, high, low, close, volume };
}

function normalizeHoldingItem(item: Record<string, unknown>): ApiHolding | null {
  const ticker = asString(item.ticker) ?? asString(item.symbol);
  if (!ticker) {
    return null;
  }

  return {
    uid: asString(item.uid),
    displayName: asString(item.displayName) ?? asString(item.display_name),
    ticker,
    companyName: asString(item.companyName) ?? asString(item.company_name),
    exchange: asString(item.exchange),
    quantity: asNumber(item.quantity) ?? asNumber(item.shares),
    currentPrice: asNumber(item.currentPrice) ?? asNumber(item.current_price),
    holdPrice: asNumber(item.holdPrice) ?? asNumber(item.hold_price),
    totalPL: asNumber(item.totalPL) ?? asNumber(item.total_pl),
    updatedAt: asString(item.updatedAt) ?? asString(item.updated_at),
  };
}

function normalizeWatchlistItem(item: Record<string, unknown>): ApiWatchlistItem | null {
  const ticker = asString(item.ticker) ?? asString(item.symbol);
  const companyName =
    asString(item.companyName) ?? asString(item.company_name) ?? ticker;
  const exchange = asString(item.exchange) ?? "";

  if (!ticker || !companyName) {
    return null;
  }

  return {
    uid: asString(item.uid),
    displayName: asString(item.displayName) ?? asString(item.display_name),
    ticker,
    companyName,
    exchange,
    currentPrice:
      asNumber(item.currentPrice) ??
      asNumber(item.current_price) ??
      asNumber(item.price),
    prevClose: asNumber(item.prevClose) ?? asNumber(item.previousClose),
    change: asNumber(item.change),
    percentChange: asNumber(item.percentChange) ?? asNumber(item.pctChange),
    open: asNumber(item.open),
    high: asNumber(item.high),
    low: asNumber(item.low),
    volume: asNumber(item.volume),
    updatedAt: asString(item.updatedAt) ?? asString(item.updated_at),
    createdAt: asString(item.createdAt) ?? asString(item.created_at),
  };
}

function normalizeTransactionItem(item: Record<string, unknown>): ApiTransaction | null {
  const id = asString(item.id) ?? asString(item._id);
  const ticker = asString(item.ticker) ?? asString(item.symbol);
  const company = asString(item.company) ?? asString(item.companyName) ?? ticker;
  const type = asString(item.type) ?? asString(item.side);
  const dateTime =
    asString(item.dateTime) ??
    asString(item.timestamp) ??
    asString(item.createdAt);
  const shares = asNumber(item.shares) ?? asNumber(item.quantity);
  const price = asNumber(item.price);

  if (!id || !ticker || !company || !type || !dateTime || shares === undefined || price === undefined) {
    return null;
  }

  return {
    id,
    uid: asString(item.uid),
    ticker,
    company,
    exchange: asString(item.exchange),
    type: type.toLowerCase() === "sell" ? "sell" : "buy",
    shares,
    price,
    totalValue:
      asNumber(item.totalValue) ??
      asNumber(item.total_value) ??
      shares * price,
    dateTime,
  };
}

export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const health = await fetchJson("/health");
    return {
      ok: true,
      source: "health",
      message:
        typeof health.status === "string"
          ? health.status
          : typeof health.message === "string"
            ? health.message
            : "Backend connected",
    };
  } catch {
    try {
      const root = await fetchJson("/");
      const rootMessage =
        typeof root.status === "string"
          ? root.status
          : typeof root.message === "string"
            ? root.message
            : "Backend connected";

      return { ok: true, source: "root", message: rootMessage };
    } catch {
      return { ok: false, source: "none", message: "Backend unreachable" };
    }
  }
}

export async function searchStocks(params: { exchange?: string; q?: string } = {}) {
  const path = process.env.NEXT_PUBLIC_API_STOCK_SEARCH_PATH ?? "/stocks/search";
  const query = new URLSearchParams();
  if (params.exchange) {
    query.set("exchange", getExchangeCode(params.exchange));
  }
  if (params.q) {
    query.set("q", params.q);
  }

  const payload = await fetchJson(`${path}${query.toString() ? `?${query.toString()}` : ""}`);
  const items = getArrayPayload(payload);
  return items.map(normalizeStockItem).filter((item): item is ApiStock => item !== null);
}

export async function getStockHistory(params: { symbol: string; range?: string }) {
  const template = process.env.NEXT_PUBLIC_API_STOCK_HISTORY_PATH ?? "/prices/history/{symbol}";
  const encodedSymbol = encodeURIComponent(params.symbol);
  const basePath = template.replace("{symbol}", encodedSymbol);
  const query = new URLSearchParams();
  if (params.range) query.set("range", params.range);
  const payload = await fetchJson(`${basePath}${query.toString() ? `?${query.toString()}` : ""}`);
  const items = getArrayPayload(payload);
  return items
    .map(normalizeHistoryItem)
    .filter((item): item is ApiOHLCPoint => item !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function initCurrentUser(token: string) {
  const payload = await fetchAuthenticatedJson("/me/init", token, "POST");
  return payload as unknown as InitCurrentUserResponse;
}

export async function getCurrentUser(token: string) {
  const payload = await fetchAuthenticatedJson("/me", token, "GET");
  return payload as unknown as AuthenticatedMe;
}

export async function getPortfolio(token: string) {
  const payload = await fetchAuthenticatedJson("/portfolio", token, "GET");
  const item = payload.data;
  return (item && typeof item === "object" ? (item as ApiPortfolio) : null);
}

export async function getHoldings(token: string) {
  const payload = await fetchAuthenticatedJson("/holdings", token, "GET");
  return getArrayPayload(payload)
    .map(normalizeHoldingItem)
    .filter((item): item is ApiHolding => item !== null);
}

export async function getTransactions(token: string) {
  const payload = await fetchAuthenticatedJson("/transactions", token, "GET");
  return getArrayPayload(payload)
    .map(normalizeTransactionItem)
    .filter((item): item is ApiTransaction => item !== null);
}

export async function getWatchlist(token: string) {
  const payload = await fetchAuthenticatedJson("/watchlist", token, "GET");
  return getArrayPayload(payload)
    .map(normalizeWatchlistItem)
    .filter((item): item is ApiWatchlistItem => item !== null);
}

export async function addWatchlistItem(
  token: string,
  item: { symbol: string; exchange: string; companyName?: string },
) {
  const response = await fetch(`${API_BASE_URL}/watchlist`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const record =
    payload.data && typeof payload.data === "object"
      ? normalizeWatchlistItem(payload.data as Record<string, unknown>)
      : null;
  return record;
}

export async function removeWatchlistItem(
  token: string,
  item: { symbol: string; exchange?: string },
) {
  const query = new URLSearchParams();
  if (item.exchange) {
    query.set("exchange", item.exchange);
  }

  const response = await fetch(
    `${API_BASE_URL}/watchlist/${encodeURIComponent(item.symbol)}${query.toString() ? `?${query.toString()}` : ""}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}

export async function executeBuyTrade(token: string, request: ExecuteTradeRequest) {
  return fetchAuthenticatedJsonWithBody("/trade/buy", token, "POST", request);
}

export async function executeSellTrade(token: string, request: ExecuteTradeRequest) {
  return fetchAuthenticatedJsonWithBody("/trade/sell", token, "POST", request);
}
