
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import type { StockData } from '@/lib/types';
import { getExchanges, searchStocks } from '@/lib/stock-data';
import { useDebounce } from 'use-debounce';

interface StockSearchProps {
  onStockSelect: (stock: StockData | null) => void;
}

export function StockSearch({ onStockSelect }: StockSearchProps) {
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [selectedExchange, setSelectedExchange] = useState('NSE');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [debouncedQuery] = useDebounce(query, 300);

  useEffect(() => {
    async function fetchExchanges() {
      const fetchedExchanges = await getExchanges();
      setExchanges(fetchedExchanges);
      if (fetchedExchanges.length > 0 && !fetchedExchanges.includes(selectedExchange)) {
        setSelectedExchange(fetchedExchanges[0]);
      }
    }
    fetchExchanges();
  }, []);

  const performSearch = useCallback(async () => {
    if (debouncedQuery.trim().length > 0) {
      setIsLoading(true);
      const stocks = await searchStocks(debouncedQuery, selectedExchange);
      setResults(stocks);
      setIsLoading(false);
      setIsDropdownVisible(true);
    } else {
      setResults([]);
      setIsDropdownVisible(false);
    }
  }, [debouncedQuery, selectedExchange]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectStock = (stock: StockData) => {
    setQuery(`${stock.ticker} - ${stock.companyName}`);
    onStockSelect(stock);
    setIsDropdownVisible(false);
  };

  const handleExchangeChange = (newExchange: string) => {
    setSelectedExchange(newExchange);
    setQuery('');
    setResults([]);
    onStockSelect(null);
    setIsDropdownVisible(false);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    onStockSelect(null);
    setIsDropdownVisible(false);
  };

  return (
    <Card ref={searchRef}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row">
          <Select onValueChange={handleExchangeChange} value={selectedExchange}>
            <SelectTrigger className="md:w-1/4">
              <SelectValue placeholder="Select Exchange" />
            </SelectTrigger>
            <SelectContent>
              {exchanges.map(ex => (
                <SelectItem key={ex} value={ex}>{ex}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ticker or company name..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if(!isDropdownVisible) setIsDropdownVisible(true);
              }}
              onFocus={() => setIsDropdownVisible(true)}
              className="pl-10 pr-10"
            />
            {query.length > 0 && (
                <button 
                  onClick={clearSearch} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                    <X className="h-4 w-4"/>
                </button>
            )}
            {isDropdownVisible && query.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-3 text-center text-muted-foreground">Searching...</div>
                ) : results.length > 0 ? (
                  results.map((stock) => (
                    <div
                      key={stock.ticker}
                      onClick={() => handleSelectStock(stock)}
                      className="p-3 hover:bg-accent cursor-pointer"
                    >
                      <div className="font-bold">{stock.ticker}</div>
                      <div className="text-sm text-muted-foreground">{stock.companyName}</div>
                    </div>
                  ))
                ) : (
                  !isLoading && <div className="p-3 text-center text-muted-foreground">No results found.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
