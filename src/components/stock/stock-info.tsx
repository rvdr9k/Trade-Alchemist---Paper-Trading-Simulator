'use client';

import type { StockData, Watchlist } from '@/lib/types';
import { Card, CardContent } from '../ui/card';
import Image from 'next/image';
import { Button } from '../ui/button';
import { BookmarkPlus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function StockInfo({ stock }: { stock: StockData }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const watchlistsQuery = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/watchlists`) : null),
    [firestore, user]
  );
  const { data: watchlists } = useCollection<Watchlist>(watchlistsQuery);


  const handleAddToWatchlist = async (watchlistId: string) => {
    if (!user) return;
    try {
        const watchlistRef = doc(firestore, `users/${user.uid}/watchlists/${watchlistId}`);
        await updateDoc(watchlistRef, {
            stockSymbols: arrayUnion(stock.ticker)
        });
        toast({
            title: "Stock Added",
            description: `${stock.ticker} has been added to your watchlist.`
        })
    } catch (error) {
         console.error('Error adding to watchlist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add stock to watchlist.',
      });
    }
  }


  const formatCurrency = (
    value: number,
    signDisplay: 'auto' | 'always' = 'auto'
  ) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      signDisplay: signDisplay,
    }).format(value);

  const isPositive = stock.dailyChange >= 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Image
            src={`https://logo.clearbit.com/${new URL(
              `http://${stock.exchange}`
            ).hostname.toLowerCase()}`}
            alt={`${stock.companyName} logo`}
            width={48}
            height={48}
            className="rounded-full"
            data-ai-hint="company logo"
          />
          <div className='flex-1'>
            <h2 className="text-xl font-bold">{stock.ticker}</h2>
            <p className="text-sm text-muted-foreground">
              {stock.companyName}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">
              {formatCurrency(stock.marketPrice)}
            </p>
            <p
              className={`text-sm font-medium ${
                isPositive ? 'text-green-600' : 'text-destructive'
              }`}
            >
              {formatCurrency(stock.dailyChange, 'always')} (
              {stock.dailyChangePercentage.toFixed(2)}%)
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                    <BookmarkPlus className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
                <div className="space-y-2">
                    <p className="text-sm font-medium">Add to Watchlist</p>
                    {watchlists && watchlists.length > 0 ? (
                        <ul className="space-y-1">
                            {watchlists.map(watchlist => (
                                <li key={watchlist.id}>
                                    <Button variant="ghost" className="w-full justify-start" onClick={() => handleAddToWatchlist(watchlist.id)}>
                                        {watchlist.name}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No watchlists found.</p>
                    )}
                </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
