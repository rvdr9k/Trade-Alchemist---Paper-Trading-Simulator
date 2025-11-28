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
import { format } from 'date-fns';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import type { Portfolio, Trade, StockData } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { getAllStocks } from '@/lib/stock-data';

export function HistoryTable() {
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

  const tradesQuery = useMemoFirebase(
    () =>
      portfolio
        ? collection(
            firestore,
            `users/${user!.uid}/portfolios/${portfolio.id}/trades`
          )
        : null,
    [firestore, user, portfolio]
  );
  const { data: trades, isLoading: isLoadingTrades } =
    useCollection<Trade>(tradesQuery);
    
  const formatCurrency = (value: number | undefined) =>
    value
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value)
      : '-';

  if (isLoadingTrades || isLoadingStocks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>
            A log of all your past buy and sell orders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Shares</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Realized P/L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading trade history...
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade History</CardTitle>
        <CardDescription>
          A log of all your past buy and sell orders.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Shares</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">Realized P/L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades && trades.length > 0 ? (
              trades.map((trade) => {
                const stock = allStockData?.find(
                  (s) => s.ticker === trade.tickerSymbol
                );
                
                return (
                  <TableRow key={trade.id}>
                    <TableCell>
                      {format(
                        new Date(trade.timestamp),
                        'MMM d, yyyy, h:mm a'
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {trade.tickerSymbol}
                    </TableCell>
                    <TableCell>{stock?.companyName ?? 'N/A'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          trade.tradeType === 'buy' ? 'default' : 'destructive'
                        }
                      >
                        {trade.tradeType.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {trade.shares}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(trade.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(trade.shares * trade.price)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        trade.realizedProfitLoss && trade.realizedProfitLoss > 0
                          ? 'text-primary'
                          : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(trade.realizedProfitLoss)}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  You have no trade history yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
