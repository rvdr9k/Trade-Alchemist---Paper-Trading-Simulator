
'use client';
import { useState } from 'react';
import type { StockData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { StockSearch } from '@/components/dashboard/stock-search';
import { StockInfo } from '@/components/stock/stock-info';
import { StockChart } from '@/components/stock/stock-chart';
import { StockDetailsCard } from '@/components/stock/stock-details-card';
import { getStockByTicker } from '@/lib/stock-data';
import { TradeDialog } from '@/components/dashboard/trade-dialog';
import { Button } from '@/components/ui/button';

export default function TradePage() {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStockSelect = async (stock: StockData | null) => {
    if (stock) {
        setIsLoading(true);
        const fullStockData = await getStockByTicker(stock.ticker, stock.exchange);
        setSelectedStock(fullStockData || null);
        setIsLoading(false);
    } else {
        setSelectedStock(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
       <div className="space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Buy Stocks</h2>
        <p className="text-muted-foreground">
          Search for stocks to purchase and add to your portfolio.
        </p>
      </div>
      <main className="flex flex-1 flex-col gap-4">
        <StockSearch onStockSelect={handleStockSelect} />
        {isLoading ? (
             <Card className="mt-4">
                <CardContent className="flex h-[400px] flex-col items-center justify-center p-6">
                    <p className="text-center text-muted-foreground">Loading stock details...</p>
                </CardContent>
            </Card>
        ) : selectedStock ? (
          <div className="flex flex-col gap-4 mt-4">
            <StockInfo stock={selectedStock} />
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                 <StockChart historicalData={selectedStock.historicalData} />
              </div>
               <div className="lg:col-span-1 space-y-4">
                <div className="grid grid-cols-2 gap-2 w-full">
                    <TradeDialog
                        stock={selectedStock}
                        tradeType="buy"
                        triggerButton={
                          <Button className="w-full rounded-full text-white" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                            Buy
                          </Button>
                        }
                      />
                      <TradeDialog
                        stock={selectedStock}
                        tradeType="sell"
                        triggerButton={
                          <Button variant="destructive" className="w-full rounded-full">
                            Sell
                          </Button>
                        }
                      />
                </div>
                <StockDetailsCard stock={selectedStock} />
              </div>
            </div>
          </div>
        ) : (
          <Card className="mt-4">
            <CardContent className="flex h-[400px] flex-col items-center justify-center p-6">
              <p className="text-center text-muted-foreground">
                Search for a stock to see its details and begin trading.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
