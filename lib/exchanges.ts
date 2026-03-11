export const EXCHANGE_OPTIONS = [
  {
    id: "NSE",
    label: "National Stock Exchange of India (NSE)",
    metadataCode: "NSI",
  },
  {
    id: "BSE",
    label: "Bombay Stock Exchange (BSE)",
    metadataCode: "BSE",
  },
  {
    id: "NYSE",
    label: "New York Stock Exchange (NYSE)",
    metadataCode: "NYQ",
  },
  {
    id: "NASDAQ",
    label: "NASDAQ (NASDAQ)",
    metadataCode: "NMS",
  },
  {
    id: "LSE",
    label: "London Stock Exchange (LSE)",
    metadataCode: "LSE",
  },
  {
    id: "HKEX",
    label: "Hong Kong Stock Exchange (HKEX)",
    metadataCode: "HKG",
  },
  {
    id: "SSE",
    label: "Shanghai Stock Exchange (SSE)",
    metadataCode: "SSE",
  },
  {
    id: "ASX",
    label: "Australian Securities Exchange (ASX)",
    metadataCode: "ASX",
  },
  {
    id: "TSX",
    label: "Toronto Stock Exchange (TSX)",
    metadataCode: "TOR",
  },
  {
    id: "JPX",
    label: "Tokyo Stock Exchange (JPX)",
    metadataCode: "JPX",
  },
] as const;

export type ExchangeOption = (typeof EXCHANGE_OPTIONS)[number];
export type ExchangeId = ExchangeOption["id"];

const METADATA_CODE_BY_ID: Record<ExchangeId, string> = EXCHANGE_OPTIONS.reduce(
  (acc, exchange) => {
    acc[exchange.id] = exchange.metadataCode;
    return acc;
  },
  {} as Record<ExchangeId, string>,
);

export function getExchangeCode(exchange: string) {
  return (METADATA_CODE_BY_ID as Record<string, string>)[exchange] ?? exchange;
}
