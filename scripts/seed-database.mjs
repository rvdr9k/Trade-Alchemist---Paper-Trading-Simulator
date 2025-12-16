
import { client } from '../src/lib/mongodb.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_NAME = 'stocksim';
const STOCKS_COLLECTION = 'stocks';
const DATA_DIR = path.resolve(__dirname, '../src/lib/data');

async function main() {
  console.log('Starting database seed process...');

  try {
    await client.connect();
    console.log('Connected to MongoDB.');

    const db = client.db(DB_NAME);
    const stocksCollection = db.collection(STOCKS_COLLECTION);

    // Clear existing data
    console.log(`Deleting existing data from "${STOCKS_COLLECTION}" collection...`);
    await stocksCollection.deleteMany({});
    console.log('Existing data deleted.');

    const exchanges = await fs.readdir(DATA_DIR);
    const allStockData = [];

    for (const exchange of exchanges) {
      const exchangePath = path.join(DATA_DIR, exchange);
      const stats = await fs.stat(exchangePath);

      if (stats.isDirectory()) {
        console.log(`Processing exchange: ${exchange}`);
        const files = await fs.readdir(exchangePath);

        // Find metadata file
        const metadataFile = files.find(f => f.endsWith('_metadata.json'));
        if (!metadataFile) {
          console.warn(`No metadata file found for exchange ${exchange}. Skipping.`);
          continue;
        }

        const metadataPath = path.join(exchangePath, metadataFile);
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        // Process each stock file
        for (const file of files) {
          if (file.endsWith('_1y.json')) {
            const ticker = file.split('_1y.json')[0];
            const stockMetadata = metadata[ticker];

            if (!stockMetadata) {
              console.warn(`No metadata found for ticker ${ticker}. Skipping.`);
              continue;
            }

            const historicalPath = path.join(exchangePath, file);
            const historicalContent = await fs.readFile(historicalPath, 'utf-8');
            const rawHistoricalData = JSON.parse(historicalContent);

            // Clean and transform historical data
            const historicalData = rawHistoricalData.map((d) => {
              const dateKey = "('Date', '')";
              const closeKey = `('Close', '${ticker}')`;
              const highKey = `('High', '${ticker}')`;
              const lowKey = `('Low', '${ticker}')`;
              const openKey = `('Open', '${ticker}')`;
              const volumeKey = `('Volume', '${ticker}')`;
              
              return {
                date: d[dateKey],
                close: d[closeKey],
                high: d[highKey],
                low: d[lowKey],
                open: d[openKey],
                volume: d[volumeKey],
              };
            }).filter(d => d.date); // Filter out any entries without a date

            if(historicalData.length === 0) {
              console.warn(`No valid historical data found for ${ticker}. Skipping.`);
              continue;
            }

            const latestData = historicalData[historicalData.length - 1];
            const previousData = historicalData[historicalData.length - 2] || latestData;

            const dailyChange = latestData.close - previousData.close;
            const dailyChangePercentage = previousData.close !== 0 ? (dailyChange / previousData.close) * 100 : 0;
            
            const combinedData = {
              ticker: stockMetadata.ticker,
              companyName: stockMetadata.companyName,
              exchange: stockMetadata.exchange,
              sector: stockMetadata.sector,
              industry: stockMetadata.industry,
              currency: stockMetadata.currency,
              marketPrice: latestData.close,
              dailyChange,
              dailyChangePercentage,
              fiftyTwoWeekHigh: stockMetadata.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: stockMetadata.fiftyTwoWeekLow,
              avgVolume: stockMetadata.avgVolume,
              marketCap: stockMetadata.marketCap,
              peRatio: stockMetadata.peRatio,
              dividendYield: stockMetadata.dividendYield,
              historicalData: historicalData,
            };

            allStockData.push(combinedData);
          }
        }
      }
    }

    if (allStockData.length > 0) {
      console.log(`Inserting ${allStockData.length} stock documents into the database...`);
      await stocksCollection.insertMany(allStockData);
      console.log('Database seeded successfully!');
    } else {
      console.log('No stock data found to seed.');
    }

  } catch (error) {
    console.error('An error occurred during the seed process:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

main();
