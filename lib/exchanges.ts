export const EXCHANGE_OPTIONS = [
  "NSE",
  "BSE",
  "NYSE",
  "NASDAQ",
  "London SE",
  "Hongkong SE",
  "Shanghai SE",
  "Australian SE",
  "Toronto SE",
  "Tokyo SE",
] as const;

export type ExchangeOption = (typeof EXCHANGE_OPTIONS)[number];

const EXCHANGE_CODE_BY_LABEL: Record<string, string> = {
  "London SE": "LSE",
  "Hongkong SE": "HKEX",
  "Hong Kong SE": "HKEX",
  "Shanghai SE": "SSE",
  "Australian SE": "ASX",
  "Toronto SE": "TSX",
  "Tokyo SE": "JPX",
};

export function getExchangeCode(exchange: string) {
  return EXCHANGE_CODE_BY_LABEL[exchange] ?? exchange;
}

function normalizeExchange(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function matchesExchangeSelection(itemExchange: string, selectedExchange: string) {
  const selectedCode = getExchangeCode(selectedExchange);
  const normalizedItem = normalizeExchange(itemExchange);
  return (
    normalizedItem === normalizeExchange(selectedExchange) ||
    normalizedItem === normalizeExchange(selectedCode)
  );
}
