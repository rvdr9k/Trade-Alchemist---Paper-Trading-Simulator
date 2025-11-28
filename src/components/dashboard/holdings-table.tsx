'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '../ui/button';
import { useCollection, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Holding, Portfolio, StockData } from '@/lib/types';
import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';

export function HoldingsTable() {
  const { user } = useUser();
  const firestore = useFirestore();

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

  const stockDataQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'stock_data') : null),
    [firestore]
  );
  const { data: stockData, isLoading: isLoadingStockData } =
    useCollection<StockData>(stockDataQuery);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const isLoading = isLoadingHoldings || isLoadingStockData;

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle>Stock</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Stock</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">Day's Gain</TableHead>
              <TableHead className="text-right">Total Gain</TableHead>
              <TableHead className="w-[20px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading holdings...
                </TableCell>
              </TableRow>
            ) : holdings && holdings.length > 0 ? (
              holdings.map((holding) => {
                const stock = stockData?.find(
                  (s) => s.ticker === holding.tickerSymbol
                );
                if (!stock) return null;

                const marketValue = holding.shares * stock.marketPrice;
                const totalCost = holding.shares * holding.costBasis;
                const dailyPL = holding.shares * stock.dailyChange;
                const totalPL = marketValue - totalCost;

                return (
                  <TableRow key={holding.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/stock/${holding.tickerSymbol}`}
                        className="font-medium hover:underline"
                      >
                        {holding.tickerSymbol}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {holding.shares} shares
                      </div>
                    </TableCell>

                    <TableCell className="text-right font-medium">
                      {formatCurrency(marketValue)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        dailyPL >= 0 ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(dailyPL)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        totalPL >= 0 ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(totalPL)}
                    </TableCell>
                    <TableCell>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  You have no holdings yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
