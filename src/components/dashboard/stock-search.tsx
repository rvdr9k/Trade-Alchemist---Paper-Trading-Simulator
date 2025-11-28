'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { StockData } from '@/lib/types';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  exchange: z.string().min(1, 'Exchange is required'),
  ticker: z.string().min(1, 'Ticker symbol is required').toUpperCase(),
});

type StockSearchForm = z.infer<typeof formSchema>;

interface StockSearchProps {
  onStockSelect: (stock: StockData | null) => void;
}

export function StockSearch({ onStockSelect }: StockSearchProps) {
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<StockSearchForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      exchange: 'USA Exchanges',
      ticker: '',
    },
  });

  const onSubmit = async (values: StockSearchForm) => {
    setIsLoading(true);
    onStockSelect(null); // Clear previous selection
    const stockQuery = query(
      collection(firestore, 'stock_data'),
      where('ticker', '==', values.ticker.toUpperCase())
    );

    try {
      const querySnapshot = await getDocs(stockQuery);
      if (!querySnapshot.empty) {
        const stockDoc = querySnapshot.docs[0];
        onStockSelect({ id: stockDoc.id, ...stockDoc.data() } as StockData);
      } else {
        toast({
            variant: 'destructive',
            title: 'Stock not found',
            description: `Could not find data for ticker "${values.ticker}".`
        })
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An error occurred while fetching stock data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 md:flex-row"
          >
            <FormField
              control={form.control}
              name="exchange"
              render={({ field }) => (
                <FormItem className="md:w-1/4">
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Exchange" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USA Exchanges">USA Exchanges</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticker"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input
                        placeholder="AAPL"
                        {...field}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="md:w-auto" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
