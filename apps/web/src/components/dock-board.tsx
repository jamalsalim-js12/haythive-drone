"use client";

import { ActuatorRail } from "@/components/actuator-rail";
import { ChargeReadiness } from "@/components/charge-readiness";
import { InstrumentStrip } from "@/components/instrument-strip";
import { CommandOutcomesChart, SocTrendChart } from "@/components/ops-charts";
import { RecentCommands } from "@/components/recent-commands";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDockStore } from "@/lib/dock-store";

export function DockBoard() {
  const { activeDevice, activeState, commands, socSeries, commandOutcomes } =
    useDockStore();

  const stale =
    activeState.connectivity === "DEGRADED" ||
    activeState.connectivity === "OFFLINE";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <InstrumentStrip device={activeDevice} state={activeState} />

      {stale ? (
        <div className="shrink-0 px-4 pt-3 sm:px-6">
          <Alert variant="destructive">
            <AlertTitle>Stale telemetry</AlertTitle>
            <AlertDescription>
              Heartbeat is delayed or missing. Commands may be rejected until
              the edge link recovers.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-28 sm:px-6 md:flex-row md:pb-6">
        <ActuatorRail />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="shrink-0">
            <ChargeReadiness state={activeState} />
          </div>

          <div className="grid shrink-0 gap-3 sm:gap-4 lg:grid-cols-2">
            <SocTrendChart data={socSeries} compact />
            <CommandOutcomesChart data={commandOutcomes} compact />
          </div>

          <RecentCommands commands={commands} deviceId={activeDevice.id} />
        </div>
      </div>
    </div>
  );
}
