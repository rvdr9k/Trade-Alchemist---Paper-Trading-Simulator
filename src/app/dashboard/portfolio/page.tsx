import { PortfolioSummary } from "@/components/dashboard/portfolio-summary";
import { HoldingsTable } from "@/components/dashboard/holdings-table";
import { AssetAllocationChart } from "@/components/dashboard/asset-allocation-chart";

export default function PortfolioPage() {
    return (
        <div className="grid gap-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">Your Portfolio</h2>
                <PortfolioSummary />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <HoldingsTable />
                </div>
                <div>
                    <AssetAllocationChart />
                </div>
            </div>
        </div>
    );
}
