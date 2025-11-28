
'use client';
import { useEffect, useState } from 'react';
import { StockChart } from '@/components/stock/stock-chart';
import { StockDetailsCard } from '@/components/stock/stock-details-card';
import { StockInfo } from '@/components/stock/stock-info';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import type { StockData } from '@/lib/types';
import { HoldingsTable } from '@/components/dashboard/holdings-table';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { getStockByTicker } from '@/lib/stock-data';
import { TradeDialog } from '@/components/dashboard/trade-dialog';
import { Button } from '@/components/ui/button';

export default function StockDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticker = (params.ticker as string)?.toUpperCase();
  const exchange = searchParams.get('exchange');
  
  const [stock, setStock] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (ticker && exchange) {
      const fetchStock = async () => {
        setIsLoading(true);
        const fetchedStock = await getStockByTicker(ticker, exchange);
        if (fetchedStock) {
          setStock(fetchedStock);
        }
        setIsLoading(false);
      };
      fetchStock();
    } else {
        setIsLoading(false);
    }
  }, [ticker, exchange]);

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
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <StockInfo stock={stock} />
            <StockChart historicalData={stock.historicalData} />
            <div className="lg:hidden">
              <RecentTransactions />
            </div>
          </div>
          <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-1">
             <TradeDialog
                stock={stock}
                tradeType="buy"
                triggerButton={
                  <Button className="w-full rounded-full text-white" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                    Buy
                  </Button>
                }
              />
               <TradeDialog
                stock={stock}
                tradeType="sell"
                triggerButton={
                  <Button variant="destructive" className="w-full rounded-full">
                    Sell
                  </Button>
                }
              />
            <StockDetailsCard stock={stock} />
            <div className="hidden lg:block">
              <RecentTransactions />
            </div>
          </div>
        </div>
        <div className="mt-8">
            <HoldingsTable />
        </div>
      </main>
    </div>
  );
}
