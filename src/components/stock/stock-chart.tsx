"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, ComposedChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { HistoricalDataPoint } from "@/lib/types";

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--primary))",
  },
  volume: {
    label: "Volume",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

export function StockChart({
  historicalData,
}: {
  historicalData: HistoricalDataPoint[];
}) {

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatVolume = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
    return value.toString();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Performance</CardTitle>
        <CardDescription>
          90-day price and volume history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ComposedChart data={historicalData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="hsl(var(--foreground))"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
            />
             <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
              tickFormatter={formatVolume}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  formatter={(value, name) => (name === "price" ? formatCurrency(value as number) : formatVolume(value as number))}
                />
              }
            />
            <defs>
              <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-price)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-price)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              yAxisId="left"
              dataKey="close"
              name="price"
              type="natural"
              fill="url(#fillPrice)"
              stroke="var(--color-price)"
              stackId="a"
            />
            <Bar
              yAxisId="right"
              dataKey="volume"
              name="volume"
              fill="var(--color-volume)"
              barSize={10}
              radius={[4, 4, 0, 0]}
              opacity={0.3}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
