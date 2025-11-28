
'use client';
import { useMemo, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Holding, Portfolio, StockData } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { getAllStocks } from '@/lib/stock-data';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function AssetAllocationChart() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [allStockData, setAllStockData] = useState<StockData[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  useEffect(() => {
    async function fetchStocks() {
      const stocks = await getAllStocks();
      setAllStockData(stocks);
      setIsLoadingStocks(false);
    }
    fetchStocks();
  }, []);

  const portfolioQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, `users/${user.uid}/portfolios`))
        : null,
    [firestore, user]
  );
  const { data: portfolios } = useCollection<Portfolio>(portfolioQuery);
  const portfolio = useMemo(() => (portfolios ? portfolios[0] : null), [
    portfolios,
  ]);

  const holdingsQuery = useMemoFirebase(
    () =>
      portfolio
        ? collection(
            firestore,
            `users/${user!.uid}/portfolios/${portfolio.id}/holdings`
          )
        : null,
    [firestore, user, portfolio]
  );
  const { data: holdings, isLoading: isLoadingHoldings } =
    useCollection<Holding>(holdingsQuery);
    
  const allocationData = useMemo(() => {
    if (!holdings || allStockData.length === 0) return [];

    const sectorAllocation: { [sector: string]: number } = {};

    holdings.forEach((holding) => {
      const stock = allStockData.find((s) => s.ticker === holding.tickerSymbol);
      if (stock) {
        // Use a fallback for marketPrice if it's not available in the search-level data
        const price = stock.marketPrice || (stock as any).lastClose || 0;
        const value = holding.shares * price;
        const sector = stock.sector || 'Other';
        if (sectorAllocation[sector]) {
          sectorAllocation[sector] += value;
        } else {
          sectorAllocation[sector] = value;
        }
      }
    });

    return Object.entries(sectorAllocation).map(([name, value]) => ({
      name,
      value,
    }));
  }, [holdings, allStockData]);

  const isLoading = isLoadingHoldings || isLoadingStocks;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
        <CardDescription>
          Your portfolio distribution across different sectors.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Skeleton className="h-[250px] w-[250px] rounded-full" />
          </div>
        ) : allocationData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                innerRadius={70}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {allocationData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                }}
                formatter={(value: number) => [
                  formatCurrency(value),
                  'Value',
                ]}
              />
              <Legend
                iconType="circle"
                formatter={(value, entry) => (
                  <span className="text-foreground/80">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] flex-col items-center justify-center">
            <p className="text-center text-muted-foreground">
              No holdings to display allocation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
