'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useFirestore,
  useUser,
  useCollection,
} from '@/firebase';
import {
  collection,
  query,
  doc,
  writeBatch,
  getDocs,
  where,
  limit,
  runTransaction,
} from 'firebase/firestore';
import type { Portfolio, Holding, StockData, Trade } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMemoFirebase } from '@/firebase/provider';

const formSchema = z.object({
  shares: z.coerce.number().positive('Shares must be a positive number'),
});

type TradeFormValues = z.infer<typeof formSchema>;

interface TradeFormProps {
  stock: StockData | null;
}

export function TradeForm({ stock }: TradeFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { shares: 0 },
  });

  const shares = form.watch('shares');
  const estimatedCost = stock ? shares * stock.marketPrice : 0;

  const onSubmit = async (data: TradeFormValues) => {
    setIsSubmitting(true);
    if (!stock || !portfolio || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot perform trade. Missing required data.',
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const portfolioRef = doc(
          firestore,
          `users/${user.uid}/portfolios/${portfolio.id}`
        );
        const portfolioDoc = await transaction.get(portfolioRef);
        if (!portfolioDoc.exists()) {
          throw new Error('Portfolio not found.');
        }
        const currentPortfolio = portfolioDoc.data() as Portfolio;

        const holdingsColRef = collection(portfolioRef, 'holdings');
        const holdingQuery = query(
          holdingsColRef,
          where('tickerSymbol', '==', stock.ticker),
          limit(1)
        );
        const holdingSnapshot = await getDocs(holdingQuery);
        const holdingDoc = holdingSnapshot.docs[0];

        if (tradeType === 'buy') {
          const cost = data.shares * stock.marketPrice;
          if (currentPortfolio.availableBuyingPower < cost) {
            throw new Error('Insufficient buying power.');
          }

          transaction.update(portfolioRef, {
            availableBuyingPower: currentPortfolio.availableBuyingPower - cost,
          });

          if (holdingDoc) {
            const currentHolding = holdingDoc.data() as Holding;
            const newShares = currentHolding.shares + data.shares;
            const newCostBasis =
              (currentHolding.costBasis * currentHolding.shares + cost) /
              newShares;
            transaction.update(holdingDoc.ref, {
              shares: newShares,
              costBasis: newCostBasis,
            });
          } else {
            const newHoldingRef = doc(holdingsColRef);
            transaction.set(newHoldingRef, {
              id: newHoldingRef.id,
              portfolioId: portfolio.id,
              tickerSymbol: stock.ticker,
              shares: data.shares,
              costBasis: stock.marketPrice,
            });
          }
        } else {
          // Sell logic
          if (!holdingDoc) {
            throw new Error(`You do not own any shares of ${stock.ticker}.`);
          }
          const currentHolding = holdingDoc.data() as Holding;
          if (currentHolding.shares < data.shares) {
            throw new Error(`You only own ${currentHolding.shares} shares.`);
          }

          const proceeds = data.shares * stock.marketPrice;
          const realizedProfitLoss =
            (stock.marketPrice - currentHolding.costBasis) * data.shares;

          transaction.update(portfolioRef, {
            availableBuyingPower:
              currentPortfolio.availableBuyingPower + proceeds,
          });

          const newShares = currentHolding.shares - data.shares;
          if (newShares === 0) {
            transaction.delete(holdingDoc.ref);
          } else {
            transaction.update(holdingDoc.ref, { shares: newShares });
          }

          const tradesColRef = collection(portfolioRef, 'trades');
          const newTradeRef = doc(tradesColRef);
          transaction.set(newTradeRef, {
            id: newTradeRef.id,
            portfolioId: portfolio.id,
            tickerSymbol: stock.ticker,
            tradeType,
            shares: data.shares,
            price: stock.marketPrice,
            timestamp: new Date().toISOString(),
            realizedProfitLoss,
          });
        }

        if (tradeType === 'buy') {
            const tradesColRef = collection(portfolioRef, 'trades');
            const newTradeRef = doc(tradesColRef);
            transaction.set(newTradeRef, {
                id: newTradeRef.id,
                portfolioId: portfolio.id,
                tickerSymbol: stock.ticker,
                tradeType,
                shares: data.shares,
                price: stock.marketPrice,
                timestamp: new Date().toISOString(),
            });
        }
      });

      toast({
        title: 'Trade Successful',
        description: `Successfully ${
          tradeType === 'buy' ? 'bought' : 'sold'
        } ${data.shares} shares of ${stock.ticker}.`,
      });
      form.reset();
    } catch (error: any) {
      console.error('Trade Error:', error);
      toast({
        variant: 'destructive',
        title: 'Trade Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade {stock?.ticker}</CardTitle>
        <CardDescription>
          Place buy or sell orders for this stock.
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <Tabs
            defaultValue="buy"
            className="w-full"
            onValueChange={(value) => setTradeType(value as 'buy' | 'sell')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="buy">Buy</TabsTrigger>
              <TabsTrigger value="sell">Sell</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="shares">Shares</Label>
            <div className="relative">
              <Controller
                name="shares"
                control={form.control}
                render={({ field }) => (
                  <Input id="shares" type="number" {...field} />
                )}
              />
            </div>
            {form.formState.errors.shares && (
              <p className="text-xs text-destructive">
                {form.formState.errors.shares.message}
              </p>
            )}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Estimated Cost:</span>
            <span>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(estimatedCost)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Buying Power:</span>
            <span>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(portfolio?.availableBuyingPower ?? 0)}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            className="w-full"
            disabled={!stock || isSubmitting}
          >
            {isSubmitting
              ? 'Placing Order...'
              : `Place ${tradeType === 'buy' ? 'Buy' : 'Sell'} Order`}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
