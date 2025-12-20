
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
import Link from 'next/link';
import { useCollection, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Holding, Portfolio, StockData } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { getStockPrices, getStockByTicker } from '@/lib/stock-data';
import { TradeDialog } from './trade-dialog';
import { Button } from '../ui/button';

export function HoldingsTable() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [stockDetails, setStockDetails] = useState<Record<string, StockData>>({});

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
  const { data: holdings, isLoading: isLoadingHoldings } = useCollection<Holding>(holdingsQuery);
    
  useEffect(() => {
    async function fetchDetails() {
      if (holdings && holdings.length > 0) {
        const details: Record<string, StockData> = {};
        for(const holding of holdings) {
            // Check if we already have the details
            if (!stockDetails[holding.tickerSymbol]) {
                const stockData = await getStockByTicker(holding.tickerSymbol, holding.exchange || 'NSE');
                if(stockData) {
                    details[holding.tickerSymbol] = stockData;
                }
            }
        }
        // Merge new details with existing ones
        setStockDetails(prevDetails => ({...prevDetails, ...details}));
      }
    }
    fetchDetails();
  }, [holdings, stockDetails]);
    
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const isLoading = isLoadingHoldings;

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle>Your Holdings</CardTitle>
        <CardDescription>
          An overview of the stocks you currently own.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Stock</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="hidden text-right md:table-cell">Day's Gain</TableHead>
              <TableHead className="hidden text-right md:table-cell">Total Gain</TableHead>
              <TableHead className="w-[160px]"></TableHead>
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
                const stock = stockDetails[holding.tickerSymbol];
                if (!stock) return (
                    <TableRow key={holding.id}>
                        <TableCell>
                            <div className="font-medium">{holding.tickerSymbol}</div>
                            <div className="text-xs text-muted-foreground">{holding.shares} shares</div>
                        </TableCell>
                        <TableCell colSpan={4} className="text-center">Loading price data...</TableCell>
                    </TableRow>
                );

                const marketValue = holding.shares * stock.marketPrice;
                const totalCost = holding.shares * holding.costBasis;
                const dailyPL = holding.shares * stock.dailyChange;
                const totalPL = marketValue - totalCost;

                return (
                  <TableRow key={holding.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/stock/${holding.tickerSymbol}?exchange=${holding.exchange || 'NSE'}`}
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
                      className={`hidden text-right md:table-cell ${
                        dailyPL >= 0 ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(dailyPL)}
                    </TableCell>
                    <TableCell
                      className={`hidden text-right md:table-cell ${
                        totalPL >= 0 ? 'text-green-600' : 'text-destructive'
                      }`}
                    >
                      {formatCurrency(totalPL)}
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                         <TradeDialog
                          stock={stock}
                          tradeType="buy"
                          holding={holding}
                          triggerButton={
                            <Button size="sm" className="h-7 rounded-full text-white" style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>Buy</Button>
                          }
                        />
                         <TradeDialog
                          stock={stock}
                          tradeType="sell"
                          holding={holding}
                           triggerButton={
                            <Button size="sm" variant="destructive" className="h-7 rounded-full">Sell</Button>
                          }
                        />
                       </div>
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
