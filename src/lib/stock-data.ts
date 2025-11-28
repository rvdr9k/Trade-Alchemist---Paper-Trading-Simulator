'use server';

import { promises as fs } from 'fs';
import path from 'path';
import type { StockData, HistoricalDataPoint } from './types';

type StockMetadata = Omit<StockData, 'historicalData' | 'id' | 'marketPrice' | 'dailyChange' | 'dailyChangePercentage'>;

// Helper function to get the data directory path
function getDataDir() {
  return path.join(process.cwd(), 'src', 'lib', 'data');
}

// Caching layer to avoid repeated file reads within the same request lifecycle
let exchangesCache: string[] | null = null;
const metadataCache: { [exchange: string]: Record<string, StockMetadata> } = {};
const stockDataCache: { [key: string]: StockData } = {};

/**
 * Dynamically reads the /data directory to get a list of all exchanges (subdirectories).
 */
export async function getExchanges(): Promise<string[]> {
  if (exchangesCache) {
    return exchangesCache;
  }
  try {
    const dataDir = getDataDir();
    const entries = await fs.readdir(dataDir, { withFileTypes: true });
    const directories = entries
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name.toUpperCase());
    
    exchangesCache = directories;
    return directories;
  } catch (error) {
    console.error("Failed to read exchange directories:", error);
    return [];
  }
}

/**
 * Loads and caches metadata for a specific exchange.
 */
async function getMetadataForExchange(exchange: string): Promise<Record<string, StockMetadata>> {
  const upperExchange = exchange.toUpperCase();
  if (metadataCache[upperExchange]) {
    return metadataCache[upperExchange];
  }

  try {
    const filePath = path.join(getDataDir(), upperExchange, `${upperExchange}_metadata.json`);
    const fileContents = await fs.readFile(filePath, 'utf8');
    const metadata = JSON.parse(fileContents);
    metadataCache[upperExchange] = metadata;
    return metadata;
  } catch (error) {
    console.error(`Failed to load metadata for exchange ${exchange}:`, error);
    return {};
  }
}

/**
 * Formats raw historical data into a structured array.
 */
function formatHistoricalData(data: any[]): HistoricalDataPoint[] {
    if (!data || data.length === 0) {
      return [];
    }

    const sample = data[0];
    const dateKey = Object.keys(sample).find(k => k.includes("'Date'"));
    const openKey = Object.keys(sample).find(k => k.includes("'Open'"));
    const highKey = Object.keys(sample).find(k => k.includes("'High'"));
    const lowKey = Object.keys(sample).find(k => k.includes("'Low'"));
    const closeKey = Object.keys(sample).find(k => k.includes("'Close'," || "'Adj Close'"));
    const volumeKey = Object.keys(sample).find(k => k.includes("'Volume'"));

    if (!dateKey || !closeKey) return [];

    return data.map((d) => ({
      date: d[dateKey] || 'N/A',
      open: d[openKey!] || 0,
      high: d[highKey!] || 0,
      low: d[lowKey!] || 0,
      close: d[closeKey] || 0,
      volume: d[volumeKey!] || 0,
    })).filter(d => d.date !== 'N/A' && d.close > 0);
}

function getMarketPrice(historicalData: HistoricalDataPoint[]): number {
    if (!historicalData || historicalData.length === 0) return 0;
    return historicalData[historicalData.length - 1].close;
}

function getDailyChange(historicalData: HistoricalDataPoint[]): { dailyChange: number, dailyChangePercentage: number } {
    if (!historicalData || historicalData.length < 2) {
        return { dailyChange: 0, dailyChangePercentage: 0 };
    }
    const lastPrice = historicalData[historicalData.length - 1].close;
    const secondLastPrice = historicalData[historicalData.length - 2].close;
    const dailyChange = lastPrice - secondLastPrice;
    const dailyChangePercentage = secondLastPrice !== 0 ? (dailyChange / secondLastPrice) * 100 : 0;
    return { dailyChange, dailyChangePercentage };
}


/**
 * Searches for stocks within a given exchange by ticker or company name.
 * Returns only the metadata, without historical data.
 */
export async function searchStocks(query: string, exchange: string): Promise<StockData[]> {
  const lowerCaseQuery = query.toLowerCase();
  
  const allMetadata = await getMetadataForExchange(exchange);

  const filtered = Object.values(allMetadata).filter(stockMeta => {
    const tickerMatch = stockMeta.ticker.toLowerCase().includes(lowerCaseQuery);
    const nameMatch = stockMeta.companyName.toLowerCase().includes(lowerCaseQuery);
    return tickerMatch || nameMatch;
  });

  return filtered.map(meta => ({
    ...meta,
    id: meta.ticker,
    marketPrice: (meta as any).lastClose ?? 0,
    dailyChange: 0,
    dailyChangePercentage: 0,
    historicalData: [], 
  }));
}

/**
 * Gets full details for a single stock, including its historical data.
 */
export async function getStockByTicker(ticker: string, exchange: string): Promise<StockData | undefined> {
  const upperExchange = exchange.toUpperCase();
  const upperTicker = ticker.toUpperCase();
  const cacheKey = `${upperTicker}@${upperExchange}`;
  
  if (stockDataCache[cacheKey]) {
    return stockDataCache[cacheKey];
  }

  try {
    const metadata = await getMetadataForExchange(upperExchange);
    const correctTickerKey = Object.keys(metadata).find(k => k.toUpperCase() === upperTicker);

    if (!correctTickerKey) {
      console.error(`Ticker ${upperTicker} not found in metadata for exchange ${upperExchange}`);
      return undefined;
    }
    
    const stockMeta = metadata[correctTickerKey];

    if (!stockMeta) {
      return undefined;
    }

    // Use the exact ticker from metadata to construct the filename
    const historyFileName = `${correctTickerKey}_1y.json`;
    const historyFilePath = path.join(getDataDir(), upperExchange, historyFileName);
    
    const historyFileContents = await fs.readFile(historyFilePath, 'utf8');
    const rawHistoricalData = JSON.parse(historyFileContents);
    
    const historicalData = formatHistoricalData(rawHistoricalData);
    const marketPrice = getMarketPrice(historicalData);
    const { dailyChange, dailyChangePercentage } = getDailyChange(historicalData);

    const fullStockData: StockData = {
      ...stockMeta,
      id: stockMeta.ticker,
      marketPrice,
      dailyChange,
      dailyChangePercentage,
      historicalData,
      marketCap: (stockMeta as any).marketCap ?? Math.random() * 1e12,
      peRatio: (stockMeta as any).peRatio ?? Math.random() * 30,
      dividendYield: (stockMeta as any).dividendYield ?? Math.random() * 5,
    };
    
    stockDataCache[cacheKey] = fullStockData;
    return fullStockData;

  } catch (error) {
    console.error(`Failed to load stock data for ${ticker} on exchange ${exchange}:`, error);
    return undefined;
  }
}

/**
 * Fetches price data for a list of tickers. Used by portfolio/holdings tables.
 */
export async function getStockPrices(tickers: {ticker: string, exchange: string}[]): Promise<Record<string, {marketPrice: number, dailyChange: number}>> {
    const prices: Record<string, {marketPrice: number, dailyChange: number}> = {};
    for (const {ticker, exchange} of tickers) {
        // Here we need to be careful as getStockByTicker can be slow if not cached
        const stockData = await getStockByTicker(ticker, exchange);
        if (stockData) {
            prices[ticker] = {
                marketPrice: stockData.marketPrice,
                dailyChange: stockData.dailyChange,
            };
        } else {
             prices[ticker] = { marketPrice: 0, dailyChange: 0 };
        }
    }
    return prices;
}

/**
 * Retrieves metadata for all stocks across all exchanges.
 */
export async function getAllStocks(): Promise<StockData[]> {
    const exchanges = await getExchanges();
    const allStocks: StockData[] = [];

    for (const exchange of exchanges) {
        const metadata = await getMetadataForExchange(exchange);
        const stocks = Object.values(metadata).map(meta => ({
            ...meta,
            id: meta.ticker,
            marketPrice: (meta as any).lastClose ?? 0,
            dailyChange: 0,
            dailyChangePercentage: 0,
            historicalData: [],
            // Add default values for missing stats in search/all view
            marketCap: (meta as any).marketCap ?? Math.random() * 1e12,
            peRatio: (meta as any).peRatio ?? Math.random() * 30,
            dividendYield: (meta as any).dividendYield ?? Math.random() * 5,
        }));
        allStocks.push(...stocks);
    }
    return allStocks;
}

