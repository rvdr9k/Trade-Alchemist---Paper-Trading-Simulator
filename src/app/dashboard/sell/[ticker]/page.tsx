'use client';
import { useEffect, useState } from 'react';
import { StockChart } from '@/components/stock/stock-chart';
import { StockDetailsCard } from '@/components/stock/stock-details-card';
import { StockInfo } from '@/components/stock/stock-info';
import { notFound, useParams } from 'next/navigation';
import type { StockData } from '@/lib/types';
import { getStockByTicker } from '@/lib/stock-data';
import { TradeDialog } from '@/components/dashboard/trade-dialog';
import { Button } from '@/components/ui/button';

export default function SellStockDetailPage() {
  const params = useParams();
  const ticker = (params.ticker as string)?.toUpperCase();
  const [stock, setStock] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (ticker) {
      const fetchStock = async () => {
        setIsLoading(true);
        const fetchedStock = await getStockByTicker(ticker);
        if (fetchedStock) {
          setStock(fetchedStock);
        }
        setIsLoading(false);
      };
      fetchStock();
    }
  }, [ticker]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading stock details...</p>
      </div>
    );
  }

  if (!stock) {
    notFound();
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
       <div className="space-y-2 mb-4">
        <h2 className="text-3xl font-bold tracking-tight">Sell {stock.ticker}</h2>
        <p className="text-muted-foreground">
            Review the details and place your sell order.
        </p>
      </div>
      <main className="flex flex-1 flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
            <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
              <StockInfo stock={stock} />
              <StockChart historicalData={stock.historicalData} />
            </div>
            <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">
              <TradeDialog stock={stock} tradeType="sell" 
                triggerButton={
                  <Button variant="destructive" className="w-full rounded-full">
                    Sell
                  </Button>
                }
              />
              <StockDetailsCard stock={stock} />
            </div>
          </div>
      </main>
    </div>
  );
}
