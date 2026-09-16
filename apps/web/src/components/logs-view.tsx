"use client";

import { useMemo, useState } from "react";
import { InstrumentStrip } from "@/components/instrument-strip";
import { ListPagination } from "@/components/list-pagination";
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
import {
  commandLabel,
  formatTimestamp,
  PAGE_SIZE,
  statusTone,
} from "@/lib/format";
import type { CommandStatus, CommandType } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL = "all";

export function LogsView() {
  const { activeDevice, activeState, commands, audit } = useDockStore();
  const [source, setSource] = useState<"commands" | "audit">("commands");
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  const filteredCommands = useMemo(() => {
    return commands.filter((c) => {
      if (c.deviceId !== activeDevice.id) return false;
      if (typeFilter !== ALL && c.type !== typeFilter) return false;
      if (statusFilter !== ALL && c.status !== statusFilter) return false;
      return true;
    });
  }, [commands, activeDevice.id, typeFilter, statusFilter]);

  const filteredAudit = useMemo(() => {
    return audit.filter((a) => a.deviceId === activeDevice.id);
  }, [audit, activeDevice.id]);

  const rows = source === "commands" ? filteredCommands : filteredAudit;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <InstrumentStrip device={activeDevice} state={activeState} />

      <div className="flex shrink-0 flex-wrap items-end gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Source
          </span>
          <Select
            value={source}
            onValueChange={(v) => {
              if (v === "commands" || v === "audit") {
                setSource(v);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="min-w-36 bg-card">
              <SelectValue>
                {(value) =>
                  value === "audit" ? "Audit events" : "Commands"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="commands" label="Commands">
                  Commands
                </SelectItem>
                <SelectItem value="audit" label="Audit events">
                  Audit events
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {source === "commands" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                Type
              </span>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  if (typeof v === "string") {
                    setTypeFilter(v);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger className="min-w-40 bg-card">
                  <SelectValue>
                    {(value) =>
                      value === ALL || value == null
                        ? "All types"
                        : commandLabel(value as CommandType)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL} label="All types">
                      All types
                    </SelectItem>
                    {(
                      [
                        "LID_OPEN",
                        "LID_CLOSE",
                        "PLATFORM_RAISE",
                        "PLATFORM_LOWER",
                        "ABORT",
                      ] as CommandType[]
                    ).map((t) => (
                      <SelectItem key={t} value={t} label={commandLabel(t)}>
                        {commandLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                Status
              </span>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  if (typeof v === "string") {
                    setStatusFilter(v);
                    setPage(1);
                  }
                }}
              >
                <SelectTrigger className="min-w-36 bg-card">
                  <SelectValue>
                    {(value) =>
                      value === ALL || value == null
                        ? "All statuses"
                        : String(value)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={ALL} label="All statuses">
                      All statuses
                    </SelectItem>
                    {(
                      [
                        "PENDING",
                        "SENT",
                        "ACKED",
                        "FAILED",
                        "TIMEOUT",
                      ] as CommandStatus[]
                    ).map((s) => (
                      <SelectItem key={s} value={s} label={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
      </div>

      <div className="min-h-48 flex-1 basis-0 overflow-y-auto overscroll-contain px-4 py-2 scrollbar-none sm:px-6">
        {source === "commands" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Command</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const cmd = row as (typeof filteredCommands)[number];
                return (
                  <TableRow key={cmd.id}>
                    <TableCell className="font-mono text-xs">
                      {cmd.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {commandLabel(cmd.type)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px]",
                          statusTone(cmd.status) === "signal" &&
                            "border-signal/40 text-signal",
                          statusTone(cmd.status) === "caution" &&
                            "border-caution/40 text-caution",
                          statusTone(cmd.status) === "destructive" &&
                            "border-destructive/40 text-destructive",
                        )}
                      >
                        {cmd.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cmd.actorEmail}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTimestamp(cmd.createdAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cmd.message ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const event = row as (typeof filteredAudit)[number];
                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs">
                      {event.id}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {event.action}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {event.entityType}/{event.entityId}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {event.actorEmail ?? "system"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatTimestamp(event.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-card px-4 sm:px-6">
        <ListPagination
          page={safePage}
          pageCount={pageCount}
          onPageChange={setPage}
          total={rows.length}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
