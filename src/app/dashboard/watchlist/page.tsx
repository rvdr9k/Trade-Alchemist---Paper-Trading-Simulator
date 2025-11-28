
'use client';
import { useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Watchlist, StockData } from '@/lib/types';
import { PlusCircle, Trash2, BookmarkPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from "@/components/ui/alert-dialog";
import { StockSearch } from '@/components/dashboard/stock-search';
import { getStockByTicker } from '@/lib/stock-data';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


export default function WatchlistPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [watchlistStocks, setWatchlistStocks] = useState<Record<string, StockData>>({});
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);

  const watchlistsQuery = useMemoFirebase(
    () => (user ? collection(firestore, `users/${user.uid}/watchlists`) : null),
    [firestore, user]
  );
  const { data: watchlists, isLoading: isLoadingWatchlists } = useCollection<Watchlist>(watchlistsQuery);

  useEffect(() => {
    async function fetchWatchlistStockData() {
      if (!watchlists) return;
      setIsLoadingStocks(true);
      const allTickers = new Set<string>();
      watchlists.forEach(w => w.stockSymbols.forEach(s => allTickers.add(s)));

      const stockDataMap: Record<string, StockData> = {};
      for (const ticker of Array.from(allTickers)) {
        // We need to know the exchange to fetch. This is a limitation.
        // For now, let's assume NSE as a default or find a better way.
        // A better Holding/Watchlist item would store the exchange.
        // For now, this might fail for non-NSE stocks.
        const stock = await getStockByTicker(ticker, 'NSE'); // Assuming NSE
        if(stock) {
            stockDataMap[ticker] = stock;
        }
      }
      setWatchlistStocks(stockDataMap);
      setIsLoadingStocks(false);
    }

    fetchWatchlistStockData();

  }, [watchlists]);

  const handleStockSelect = async (stock: StockData | null) => {
    if (stock) {
      const fullStockData = await getStockByTicker(stock.ticker, stock.exchange);
      setSelectedStock(fullStockData || null);
    } else {
      setSelectedStock(null);
    }
  };

  const handleAddToWatchlist = async (watchlistId: string) => {
    if (!user || !selectedStock) return;
    try {
        const watchlistRef = doc(firestore, `users/${user.uid}/watchlists/${watchlistId}`);
        await updateDoc(watchlistRef, {
            stockSymbols: arrayUnion(selectedStock.ticker)
        });
        toast({
            title: "Stock Added",
            description: `${selectedStock.ticker} has been added to your watchlist.`
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

  const handleDeleteWatchlist = async (watchlistId: string, watchlistName: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(firestore, `users/${user.uid}/watchlists/${watchlistId}`));
      toast({
        title: 'Watchlist Deleted',
        description: `"${watchlistName}" has been successfully deleted.`,
      });
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the watchlist.',
      });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your Watchlists</h2>
        <p className="text-muted-foreground">
          Track your favorite stocks by creating and managing watchlists.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add to Watchlist</CardTitle>
          <CardDescription>Search for a stock and add it to one of your lists below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <StockSearch onStockSelect={handleStockSelect} />
           {selectedStock && (
             <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                             <div className='flex-1'>
                                <p className="font-bold">{selectedStock.ticker}</p>
                                <p className="text-sm text-muted-foreground">{selectedStock.companyName}</p>
                            </div>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button>
                                    <BookmarkPlus className="mr-2 h-4 w-4" /> Add to...
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56">
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Your Watchlists</p>
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
           )}
        </CardContent>
      </Card>


      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold tracking-tight">Manage Watchlists</h3>
        <div className="flex gap-2">
          <Input
            placeholder="New Watchlist Name"
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
            className="w-[200px]"
          />
          <Button onClick={handleCreateWatchlist}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Watchlist
          </Button>
        </div>
      </div>

      {isLoadingWatchlists || isLoadingStocks ? (
        <p>Loading watchlists...</p>
      ) : watchlists && watchlists.length > 0 ? (
        watchlists.map((watchlist) => (
          <Card key={watchlist.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{watchlist.name}</CardTitle>
                <CardDescription>
                  Stocks you are currently tracking in this list.
                </CardDescription>
              </div>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Trash2 className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the &quot;{watchlist.name}&quot; watchlist and all of its data. This action cannot be undone.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteWatchlist(watchlist.id, watchlist.name)}>
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                      const stock = watchlistStocks[ticker];
                      if (!stock) return (
                        <TableRow key={ticker}>
                          <TableCell className="font-medium">{ticker}</TableCell>
                          <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                        </TableRow>
                      );
                      const isPositive = stock.dailyChange >= 0;
                      return (
                        <TableRow key={ticker}>
                          <TableCell className="font-medium">
                            <Link href={`/dashboard/stock/${ticker}?exchange=${stock.exchange}`} className="hover:underline">
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
                        No stocks in this watchlist yet. Search for a stock above to add one.
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
