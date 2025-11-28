
'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useCollection } from '@/firebase';
import {
  collection,
  query,
  doc,
  runTransaction,
  getDocs,
  where,
  limit,
} from 'firebase/firestore';
import type { Portfolio, Holding, StockData, Trade } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useMemoFirebase } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  shares: z.coerce.number().positive('Shares must be a positive number'),
});

type TradeFormValues = z.infer<typeof formSchema>;

interface TradeDialogProps {
  stock: StockData;
  tradeType: 'buy' | 'sell';
  holding?: Holding;
  triggerButton?: ReactNode;
}

export function TradeDialog({ stock, tradeType, holding, triggerButton }: TradeDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
  const estimatedValue = stock ? shares * stock.marketPrice : 0;
  const platformFee = estimatedValue * 0.02;
  const netValue = tradeType === 'buy' ? estimatedValue + platformFee : estimatedValue - platformFee;

  const handleMaxShares = () => {
    if (tradeType === 'sell' && holding) {
      form.setValue('shares', holding.shares);
    } else if (tradeType === 'buy' && portfolio && stock.marketPrice > 0) {
        const maxShares = Math.floor(portfolio.availableBuyingPower / (stock.marketPrice * 1.02));
        form.setValue('shares', maxShares > 0 ? maxShares : 0);
    }
  };


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
          const cost = data.shares * stock.marketPrice * 1.02; // with fee
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
              (currentHolding.costBasis * currentHolding.shares + (data.shares * stock.marketPrice)) /
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
              exchange: stock.exchange,
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
          const netProceeds = proceeds * 0.98; // after fee
          const realizedProfitLoss =
            (stock.marketPrice - currentHolding.costBasis) * data.shares;

          transaction.update(portfolioRef, {
            availableBuyingPower:
              currentPortfolio.availableBuyingPower + netProceeds,
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
      setIsOpen(false);
      router.refresh();
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {tradeType} {stock.ticker}
          </DialogTitle>
          <DialogDescription>
             {tradeType === 'sell' && holding
              ? `You currently own ${holding.shares} shares. Current price is ${formatCurrency(stock.marketPrice)}.`
              : `Current price is ${formatCurrency(stock.marketPrice)}. You have ${formatCurrency(portfolio?.availableBuyingPower ?? 0)} available.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shares" className="text-right">
                Shares
              </Label>
              <div className="col-span-3 relative">
                <Controller
                  name="shares"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      id="shares"
                      type="number"
                      className="pr-12"
                      {...field}
                    />
                  )}
                />
                 <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7" onClick={handleMaxShares}>Max</Button>
              </div>
               {form.formState.errors.shares && (
                <p className="col-span-4 text-xs text-destructive text-right">
                    {form.formState.errors.shares.message}
                </p>
                )}
            </div>
             <div className="flex justify-between text-sm text-muted-foreground">
                <span>Est. Gross {tradeType === 'buy' ? 'Cost' : 'Proceeds'}:</span>
                <span>{formatCurrency(estimatedValue)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
                <span>Platform Fee (2%):</span>
                <span className={tradeType === 'sell' ? 'text-destructive' : ''}>
                    {tradeType === 'sell' ? '-' : ''}{formatCurrency(platformFee)}
                </span>
            </div>
             <div className="flex justify-between text-sm font-semibold">
                <span>Est. Net {tradeType === 'buy' ? 'Cost' : 'Credit'}:</span>
                <span>{formatCurrency(netValue)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={isSubmitting || shares <= 0}
              className="capitalize"
              variant={tradeType === 'sell' ? 'destructive' : 'default'}
            >
              {isSubmitting ? 'Submitting...' : `${tradeType} ${shares > 0 ? shares : ''} Shares`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
