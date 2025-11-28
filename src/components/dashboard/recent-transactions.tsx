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
import { collection, query, limit, orderBy } from 'firebase/firestore';
import type { Portfolio, Trade } from '@/lib/types';
import { useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';

export function RecentTransactions() {
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

  const tradesQuery = useMemoFirebase(
    () =>
      portfolio
        ? query(
            collection(
              firestore,
              `users/${user!.uid}/portfolios/${portfolio.id}/trades`
            ),
            orderBy('timestamp', 'desc'),
            limit(5)
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your 5 most recent trades.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Details</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>P/L</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[20px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingTrades ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading transactions...
                </TableCell>
              </TableRow>
            ) : trades && trades.length > 0 ? (
              trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <Badge
                        variant={
                          trade.tradeType === 'buy' ? 'default' : 'secondary'
                        }
                        className={`text-xs ${
                          trade.tradeType === 'buy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                        }`}
                      >
                        {trade.tradeType.toUpperCase()}
                      </Badge>
                       <div>
                         <div className="font-medium">{trade.tickerSymbol}</div>
                         <div className="text-xs text-muted-foreground">{trade.shares} shares @ {formatCurrency(trade.price)}</div>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(trade.timestamp), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell
                    className={`text-xs ${
                      trade.realizedProfitLoss && trade.realizedProfitLoss > 0
                        ? 'text-green-600'
                        : trade.realizedProfitLoss && trade.realizedProfitLoss < 0
                        ? 'text-destructive'
                        : ''
                    }`}
                  >
                    {trade.realizedProfitLoss
                      ? formatCurrency(trade.realizedProfitLoss)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {formatCurrency(trade.shares * trade.price)}
                  </TableCell>
                  <TableCell>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No recent transactions.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
