"use client";

import { Badge } from "@/components/ui/badge";
import { formatHeartbeatAge } from "@/lib/format";
import type { Device, DeviceState } from "@/lib/types";
import { cn } from "@/lib/utils";

function SignalDot({
  tone,
}: {
  tone: "signal" | "caution" | "destructive" | "offline";
}) {
  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full",
        tone === "signal" && "bg-signal animate-pulse-live",
        tone === "caution" && "bg-caution",
        tone === "destructive" && "bg-destructive",
        tone === "offline" && "bg-offline",
      )}
      aria-hidden
    />
  );
}

function connectivityTone(c: DeviceState["connectivity"]) {
  if (c === "ONLINE") return "signal" as const;
  if (c === "DEGRADED") return "caution" as const;
  return "offline" as const;
}

function opTone(o: DeviceState["opState"]) {
  if (o === "IDLE") return "signal" as const;
  if (o === "MOVING" || o === "SERVICE") return "caution" as const;
  return "destructive" as const;
}

export function InstrumentStrip({
  device,
  state,
}: {
  device: Device;
  state: DeviceState;
}) {
  return (
    <div className="shrink-0 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {device.name}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {device.serial} · {device.siteName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 font-mono text-[11px]">
            <SignalDot tone={connectivityTone(state.connectivity)} />
            {state.connectivity}
          </Badge>
          <Badge variant="outline" className="gap-1.5 font-mono text-[11px]">
            <SignalDot tone={opTone(state.opState)} />
            {state.opState}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[11px]",
              state.readiness === "READY"
                ? "border-signal/40 text-signal"
                : "text-muted-foreground",
            )}
          >
            {state.readiness === "READY" ? "READY" : "NOT READY"}
          </Badge>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
          <span>
            Lid <span className="text-foreground">{state.lid}</span>
          </span>
          <span>
            Platform <span className="text-foreground">{state.platform}</span>
          </span>
          <span>
            Charge <span className="text-foreground">{state.chargeStatus}</span>
          </span>
          <span>
            HB{" "}
            <span className="text-foreground">
              {formatHeartbeatAge(state.lastHeartbeatAt)} ago
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
