"use client";

import { CheckIcon, XIcon, ZapIcon } from "lucide-react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DeviceState } from "@/lib/types";
import { cn } from "@/lib/utils";

const socConfig = {
  soc: { label: "SOC", color: "var(--color-signal)" },
} satisfies ChartConfig;

export function ChargeReadiness({ state }: { state: DeviceState }) {
  const chartData = [
    { name: "soc", soc: state.socPercent, fill: "var(--color-signal)" },
  ];
  const charging =
    state.chargeStatus === "CHARGING" || state.chargeStatus === "CHARGED";

  return (
    <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-3">
        <div className="relative flex size-[120px] items-center justify-center">
          <ChartContainer
            config={socConfig}
            className="absolute inset-0 aspect-square size-full"
          >
            <RadialBarChart
              data={chartData}
              startAngle={90}
              endAngle={-270}
              innerRadius="70%"
              outerRadius="100%"
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="soc" background cornerRadius={6} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            </RadialBarChart>
          </ChartContainer>
          <ZapIcon
            aria-hidden
            className={cn(
              "relative z-10 size-8",
              charging ? "fill-signal text-signal" : "text-muted-foreground",
            )}
          />
        </div>
        <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
          {state.socPercent}%
        </p>
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {state.chargeStatus.replaceAll("_", " ")}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Readiness</p>
          <span
            className={cn(
              "font-mono text-xs",
              state.readiness === "READY" ? "text-signal" : "text-caution",
            )}
          >
            {state.readiness.replaceAll("_", " ")}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {state.readinessChecks.map((check) => (
            <li key={check.id} className="flex items-start gap-2 text-sm">
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                  check.pass
                    ? "bg-signal/15 text-signal"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {check.pass ? (
                  <CheckIcon className="size-3" />
                ) : (
                  <XIcon className="size-3" />
                )}
              </span>
              <span className="min-w-0">
                <span className="text-foreground">{check.label}</span>
                {check.detail ? (
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    {check.detail}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
