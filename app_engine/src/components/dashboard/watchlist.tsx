import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function Watchlist() {
    // This is a placeholder. We can add real data later.
    const watchlist = [
        { ticker: 'GOOGL', price: 2835.47, change: 1.2, changePercent: 0.04 },
        { ticker: 'AMZN', price: 3401.46, change: -12.4, changePercent: -0.36 },
        { ticker: 'TSLA', price: 733.57, change: 21.8, changePercent: 3.06 },
    ]
    return (
        <Card>
            <CardHeader>
                <CardTitle>Watchlist</CardTitle>
                <CardDescription>Your tracked stocks.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Symbol</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Change</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {watchlist.map(stock => (
                        <TableRow key={stock.ticker}>
                            <TableCell className="font-medium">{stock.ticker}</TableCell>
                            <TableCell className="text-right">${stock.price.toFixed(2)}</TableCell>
                            <TableCell className={`text-right ${stock.change >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                {stock.change.toFixed(2)}%
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
