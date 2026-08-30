"use client";

import * as React from "react";
import { Label, Pie, PieChart, CartesianGrid, XAxis, Cell, Area, AreaChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { TrendingUp, Wallet, PieChart as PieIcon } from "lucide-react";

// --- Types ---
interface ChartDataProps {
    stats: {
        paid: number;
        unpaid: number;
        total: number;
    };
    trend: {
        date: string;
        count: number;
    }[];
}

// --- Color Palette (Consistent) ---
// Using CSS variables or Hex for consistency across both charts
const COLORS = {
    paid: "#10b981",   // Emerald 500
    unpaid: "#f43f5e", // Rose 500
    trend: "#10b981",  // Emerald 500 (Consistent with 'Paid' success theme)
    trendFill: "#10b981" 
};

// --- Status Distribution Chart (Donut) ---
const statusConfig = {
  paid: { label: "Paid", color: COLORS.paid },
  unpaid: { label: "Unpaid", color: COLORS.unpaid },
} satisfies ChartConfig;

export function StatusDistributionChart({ data }: { data: ChartDataProps['stats'] }) {
  const chartData = [
    { status: "paid", count: data.paid, fill: COLORS.paid },
    { status: "unpaid", count: data.unpaid, fill: COLORS.unpaid },
  ];

  // Calculate Percentage
  const total = data.total || 1; // Prevent division by zero
  const paidPercentage = ((data.paid / total) * 100).toFixed(1);

  // Financial Estimate (Example: 1500 TL per delegate)
  const TICKET_PRICE = 1500;
  const collectedAmount = data.paid * TICKET_PRICE;
  const potentialAmount = data.total * TICKET_PRICE;

  return (
    <Card className="flex flex-col border-border/50 shadow-sm h-full">
      <CardHeader className="items-start pb-0">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-emerald-600" />
            Payment rate
        </CardTitle>
        <CardDescription>Payment status of approved delegates</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 min-h-[250px]">
        <ChartContainer
          config={statusConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={65}
              outerRadius={90}
              strokeWidth={0}
              paddingAngle={2}
            >
              <Cell key="paid" fill={COLORS.paid} />
              <Cell key="unpaid" fill={COLORS.unpaid} />
              
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold tracking-tighter"
                        >
                          %{paidPercentage.replace('.0', '')}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-xs font-medium uppercase tracking-wider"
                        >
                          COMPLETED
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent />} className="-translate-y-2 mt-4" />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 pt-4 border-t border-border/50 bg-muted/5">
        <div className="flex w-full items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">Total collected</span>
            <span className="text-lg font-bold text-foreground font-mono">
                {collectedAmount.toLocaleString('en-GB')} ₺
            </span>
        </div>
        <div className="w-full flex justify-between text-[10px] text-muted-foreground">
            <span>Target: {potentialAmount.toLocaleString('en-GB')} ₺</span>
            <span>{data.paid} / {data.total} people</span>
        </div>
      </CardFooter>
    </Card>
  );
}

// --- Trend Chart (Area) ---
const trendConfig = {
  count: {
    label: "Uploads",
    color: COLORS.trend,
  },
} satisfies ChartConfig;

export function UploadTrendChart({ data }: { data: ChartDataProps['trend'] }) {
  const totalActivity = data.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <Card className="border-border/50 shadow-sm flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Activity volume
        </CardTitle>
        <CardDescription>Receipt upload activity over the last 7 days</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-[200px]">
        <ChartContainer config={trendConfig} className="max-h-[250px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 0,
              right: 0,
              top: 10,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.trend} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.trend} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => value.slice(0, 5)}
              style={{ fontSize: '10px', fill: 'var(--muted-foreground)' }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="count"
              type="monotone"
              fill="url(#fillCount)"
              stroke={COLORS.trend}
              strokeWidth={3}
              activeDot={{ r: 6, strokeWidth: 0, fill: COLORS.trend }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="pt-4 border-t border-border/50 bg-muted/5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600">
                <Wallet className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
                <span className="text-xs font-medium uppercase tracking-wide opacity-70">Weekly activity</span>
                <span className="text-sm font-semibold text-foreground">{totalActivity} <span className="font-normal text-muted-foreground">new receipts uploaded</span></span>
            </div>
        </div>
      </CardFooter>
    </Card>
  );
}
// Change Log:
// - Donut Chart: 
//   - Updated label to show Percentage %.
//   - Updated data to use `paid` and `unpaid` calculated from API.
//   - Added "Total Revenue" footer.
//   - Used Emerald/Rose color scheme.
// - Trend Chart:
//   - Updated color to Emerald to match the "Paid" theme (Consistent).
//   - Improved Footer UI.
