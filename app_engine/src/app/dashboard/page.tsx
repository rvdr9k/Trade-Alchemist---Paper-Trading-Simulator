'use client';
import { HoldingsTable } from '@/components/dashboard/holdings-table';
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { Watchlist } from '@/components/dashboard/watchlist';

export default function DashboardPage() {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-1">
        <PortfolioSummary />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid auto-rows-max items-start gap-4 lg:col-span-2">
          <HoldingsTable />
        </div>

        <div className="grid auto-rows-max items-start gap-4 lg:col-span-1">
          <Watchlist />
          <RecentTransactions />
        </div>
      </div>
    </>
  );
}
