import { HoldingsTable } from "@/components/dashboard/holdings-table";

export default function SellPage() {
    return (
        <div className="flex flex-col gap-8">
             <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Sell Stocks</h2>
                <p className="text-muted-foreground">
                  Select a stock from your holdings below to sell.
                </p>
            </div>
            <HoldingsTable />
        </div>
    );
}
