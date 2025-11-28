'use client';

import { StockChart } from '@/components/stock/stock-chart';
import { StockDetailsCard } from '@/components/stock/stock-details-card';
import { StockInfo } from '@/components/stock/stock-info';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { useMemoFirebase } from '@/firebase/provider';
import type { StockData } from '@/lib/types';
import { TradeForm } from '@/components/dashboard/trade-form';
import { HoldingsTable } from '@/components/dashboard/holdings-table';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';

export default function StockDetailPage() {
  const params = useParams();
  const ticker = (params.ticker as string)?.toUpperCase();
  const firestore = useFirestore();

  const stockRef = useMemoFirebase(
    () => (ticker ? doc(firestore, `stock_data/${ticker}`) : null),
    [firestore, ticker]
  );
  const { data: stock, isLoading } = useDoc<StockData>(stockRef);

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
            <TradeForm stock={stock} />
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
