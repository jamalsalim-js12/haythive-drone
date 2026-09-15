"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type {
  CommandOutcomePoint,
  HeartbeatPoint,
  SocPoint,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const socConfig = {
  soc: { label: "SOC %", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

const outcomeConfig = {
  success: { label: "Acked", color: "var(--color-chart-1)" },
  failed: { label: "Failed", color: "var(--color-chart-4)" },
} satisfies ChartConfig;

const hbConfig = {
  ageSec: { label: "Age (s)", color: "var(--color-chart-2)" },
} satisfies ChartConfig;

export function SocTrendChart({
  data,
  compact = false,
}: {
  data: SocPoint[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <p className="mb-2 text-sm font-medium text-foreground sm:mb-3">
        Charge (24h)
      </p>
      <ChartContainer
        config={socConfig}
        className={cn("w-full", compact ? "aspect-[2.6/1]" : "aspect-[2/1]")}
      >
        <AreaChart
          data={data}
          margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={[0, 100]}
            width={32}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey="soc"
            stroke="var(--color-soc)"
            fill="var(--color-soc)"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export function CommandOutcomesChart({
  data,
  compact = false,
}: {
  data: CommandOutcomePoint[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <p className="mb-2 text-sm font-medium text-foreground sm:mb-3">
        Commands (7d)
      </p>
      <ChartContainer
        config={outcomeConfig}
        className={cn("w-full", compact ? "aspect-[2.6/1]" : "aspect-[2/1]")}
      >
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            width={28}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            dataKey="success"
            fill="var(--color-success)"
            radius={3}
            stackId="a"
          />
          <Bar
            dataKey="failed"
            fill="var(--color-failed)"
            radius={3}
            stackId="a"
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function HeartbeatChart({
  data,
  compact = false,
}: {
  data: HeartbeatPoint[];
  compact?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
      <p className="mb-2 text-sm font-medium text-foreground sm:mb-3">
        Heartbeat age
      </p>
      <ChartContainer
        config={hbConfig}
        className={cn("w-full", compact ? "aspect-[2.6/1]" : "aspect-[2.4/1]")}
      >
        <LineChart
          data={data}
          margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis width={28} tickLine={false} axisLine={false} unit="s" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="ageSec"
            stroke="var(--color-ageSec)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
