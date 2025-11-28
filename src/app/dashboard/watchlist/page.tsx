'use client';
import { useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Watchlist, StockData } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function WatchlistPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newWatchlistName, setNewWatchlistName] = useState('');

  const watchlistsQuery = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/watchlists`) : null),
    [firestore, user]
  );
  const { data: watchlists, isLoading: isLoadingWatchlists } = useCollection<Watchlist>(watchlistsQuery);

  const stockDataQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'stock_data') : null),
    [firestore]
  );
  const { data: stockData } = useCollection<StockData>(stockDataQuery);

  const handleCreateWatchlist = async () => {
    if (!user || !newWatchlistName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Watchlist name cannot be empty.',
      });
      return;
    }
    try {
      const watchlistCollectionRef = collection(firestore, `users/${user.uid}/watchlists`);
      await addDoc(watchlistCollectionRef, {
        userProfileId: user.uid,
        name: newWatchlistName,
        stockSymbols: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: 'Success',
        description: `Watchlist "${newWatchlistName}" created.`,
      });
      setNewWatchlistName('');
    } catch (error: any) {
      console.error('Error creating watchlist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not create watchlist.',
      });
    }
  };

  const handleRemoveStock = async (watchlistId: string, ticker: string) => {
    if (!user) return;
    try {
        const watchlistRef = doc(firestore, `users/${user.uid}/watchlists/${watchlistId}`);
        await updateDoc(watchlistRef, {
            stockSymbols: arrayRemove(ticker)
        });
        toast({
            title: "Stock Removed",
            description: `${ticker} has been removed from the watchlist.`
        })
    } catch (error) {
         console.error('Error removing stock from watchlist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not remove stock.',
      });
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Your Watchlists</h2>
        <div className="flex gap-2">
          <Input
            placeholder="New Watchlist Name"
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
            className="w-[200px]"
          />
          <Button onClick={handleCreateWatchlist}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create
          </Button>
        </div>
      </div>

      {isLoadingWatchlists ? (
        <p>Loading watchlists...</p>
      ) : watchlists && watchlists.length > 0 ? (
        watchlists.map((watchlist) => (
          <Card key={watchlist.id}>
            <CardHeader>
              <CardTitle>{watchlist.name}</CardTitle>
              <CardDescription>
                Stocks you are currently tracking in this list.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead className="text-right">Market Price</TableHead>
                    <TableHead className="text-right">Day's Change</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlist.stockSymbols.length > 0 ? (
                    watchlist.stockSymbols.map((ticker) => {
                      const stock = stockData?.find((s) => s.ticker === ticker);
                      if (!stock) return null;
                      const isPositive = stock.dailyChange >= 0;
                      return (
                        <TableRow key={ticker}>
                          <TableCell className="font-medium">
                            <Link href={`/dashboard/stock/${ticker}`} className="hover:underline">
                                {ticker}
                            </Link>
                          </TableCell>
                          <TableCell>{stock.companyName}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(stock.marketPrice)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              isPositive
                                ? 'text-green-600'
                                : 'text-destructive'
                            }`}
                          >
                            {formatCurrency(stock.dailyChange)} (
                            {stock.dailyChangePercentage.toFixed(2)}%)
                          </TableCell>
                           <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently remove {ticker} from this watchlist.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveStock(watchlist.id, ticker)}>
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No stocks in this watchlist yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="flex h-[200px] flex-col items-center justify-center p-6">
            <p className="text-center text-muted-foreground">
              You have no watchlists. Create one to start tracking stocks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}