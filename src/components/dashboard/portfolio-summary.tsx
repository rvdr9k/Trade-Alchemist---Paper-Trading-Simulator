'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useUser } from '@/firebase';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Portfolio, Holding, StockData } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

export function PortfolioSummary() {
  const { user } = useUser();
  const firestore = useFirestore();

  const portfolioQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, `users/${user.uid}/portfolios`),
            where('userProfileId', '==', user.uid)
          )
        : null,
    [firestore, user]
  );
  const { data: portfolios, isLoading: isLoadingPortfolios } =
    useCollection<Portfolio>(portfolioQuery);
  const portfolio = useMemo(
    () => (portfolios ? portfolios[0] : null),
    [portfolios]
  );

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

  const { portfolioValue, dailyPL, dailyPLPercentage, buyingPower } =
    useMemo(() => {
      if (!portfolio || !holdings || !stockData) {
        return {
          portfolioValue: 0,
          dailyPL: 0,
          dailyPLPercentage: 0,
          buyingPower: portfolio?.availableBuyingPower ?? 0,
        };
      }

      const holdingsValue = holdings.reduce((acc, holding) => {
        const stock = stockData.find((s) => s.ticker === holding.tickerSymbol);
        return acc + (stock ? stock.marketPrice * holding.shares : 0);
      }, 0);

      const dailyPL = holdings.reduce((acc, holding) => {
        const stock = stockData.find((s) => s.ticker === holding.tickerSymbol);
        return acc + (stock ? stock.dailyChange * holding.shares : 0);
      }, 0);

      const portfolioValue = holdingsValue + portfolio.availableBuyingPower;
      const yesterdayValue = portfolioValue - dailyPL;
      const dailyPLPercentage =
        yesterdayValue !== 0 ? (dailyPL / yesterdayValue) * 100 : 0;

      return {
        portfolioValue,
        dailyPL,
        dailyPLPercentage,
        buyingPower: portfolio.availableBuyingPower,
      };
    }, [portfolio, holdings, stockData]);

  const formatCurrency = (value: number, signDisplay: 'auto' | 'always' = 'auto') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay,
    }).format(value);
  };

  const isLoading =
    isLoadingPortfolios || isLoadingHoldings || isLoadingStockData;

  const summaryCards = [
    {
      title: 'Total Portfolio Value',
      value: formatCurrency(portfolioValue),
      description: 'The total value of your cash and stock holdings.',
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      isLoading: isLoading,
    },
    {
      title: "Today's Gain/Loss",
      value: formatCurrency(dailyPL, 'always'),
      description: `${dailyPLPercentage.toFixed(2)}% today`,
      valueColor: dailyPL >= 0 ? 'text-green-600' : 'text-destructive',
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      isLoading: isLoading,
    },
    {
      title: 'Buying Power',
      value: formatCurrency(buyingPower),
      description: 'Available cash to trade.',
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      isLoading: isLoading,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {summaryCards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent>
            {card.isLoading ? (
              <>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </>
            ) : (
              <>
                <div className={`text-2xl font-bold ${card.valueColor || ''}`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
