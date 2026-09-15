"use client";

import { useMemo, useState } from "react";
import { InstrumentStrip } from "@/components/instrument-strip";
import { ListPagination } from "@/components/list-pagination";
import { CommandOutcomesChart, HeartbeatChart } from "@/components/ops-charts";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDockStore } from "@/lib/dock-store";
import { formatTimestamp, PAGE_SIZE } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALL = "all";

export function HealthView() {
  const {
    activeDevice,
    activeState,
    faults,
    heartbeatSeries,
    commandOutcomes,
  } = useDockStore();
  const [severity, setSeverity] = useState<string>(ALL);
  const [resolved, setResolved] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return faults.filter((f) => {
      if (f.deviceId !== activeDevice.id) return false;
      if (severity !== ALL && f.severity !== severity) return false;
      if (resolved === "open" && f.resolved) return false;
      if (resolved === "resolved" && !f.resolved) return false;
      return true;
    });
  }, [faults, activeDevice.id, severity, resolved]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <InstrumentStrip device={activeDevice} state={activeState} />

      <div className="grid shrink-0 grid-cols-1 gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 md:grid-cols-2">
        <HeartbeatChart data={heartbeatSeries} compact />
        <CommandOutcomesChart data={commandOutcomes} compact />
      </div>

      <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-border px-4 pb-3 sm:px-6">
        <div className="mr-auto">
          <p className="text-sm font-medium text-foreground">Fault log</p>
          <p className="text-xs text-muted-foreground">
            Connectivity and actuator faults for this dock
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Severity
          </span>
          <Select
            value={severity}
            onValueChange={(v) => {
              if (typeof v === "string") {
                setSeverity(v);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="min-w-36 bg-card">
              <SelectValue>
                {(value) =>
                  value === "warning"
                    ? "Warning"
                    : value === "critical"
                      ? "Critical"
                      : "All"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL} label="All">
                  All
                </SelectItem>
                <SelectItem value="warning" label="Warning">
                  Warning
                </SelectItem>
                <SelectItem value="critical" label="Critical">
                  Critical
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            State
          </span>
          <Select
            value={resolved}
            onValueChange={(v) => {
              if (typeof v === "string") {
                setResolved(v);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="min-w-36 bg-card">
              <SelectValue>
                {(value) =>
                  value === "open"
                    ? "Open"
                    : value === "resolved"
                      ? "Resolved"
                      : "All"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL} label="All">
                  All
                </SelectItem>
                <SelectItem value="open" label="Open">
                  Open
                </SelectItem>
                <SelectItem value="resolved" label="Resolved">
                  Resolved
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2 scrollbar-none sm:px-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>State</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.code}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-[10px]",
                      row.severity === "critical"
                        ? "border-destructive/40 text-destructive"
                        : "border-caution/40 text-caution",
                    )}
                  >
                    {row.severity}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-md text-sm">
                  {row.message}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.resolved ? "resolved" : "open"}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatTimestamp(row.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="shrink-0 border-t border-border bg-card px-4 sm:px-6">
        <ListPagination
          page={safePage}
          pageCount={pageCount}
          onPageChange={setPage}
          total={filtered.length}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
