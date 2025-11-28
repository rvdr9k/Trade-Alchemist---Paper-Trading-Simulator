'use client';
import { useState } from 'react';
import type { StockData } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { StockSearch } from '@/components/dashboard/stock-search';
import { TradeForm } from '@/components/dashboard/trade-form';
import { StockInfo } from '@/components/stock/stock-info';
import { StockChart } from '@/components/stock/stock-chart';
import { StockDetailsCard } from '@/components/stock/stock-details-card';

export default function TradePage() {
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);

  const handleStockSelect = (stock: StockData | null) => {
    setSelectedStock(stock);
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
       <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Trade</h2>
      </div>
      <main className="flex flex-1 flex-col gap-4">
        <StockSearch onStockSelect={handleStockSelect} />
        {selectedStock ? (
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
              <StockInfo stock={selectedStock} />
              <StockChart historicalData={selectedStock.historicalData} />
            </div>
            <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">
              <TradeForm stock={selectedStock} />
              <StockDetailsCard stock={selectedStock} />
            </div>
          </div>
        ) : (
          <Card className="mt-4">
            <CardContent className="flex h-[400px] flex-col items-center justify-center p-6">
              <p className="text-center text-muted-foreground">
                Search for a stock to begin trading.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
