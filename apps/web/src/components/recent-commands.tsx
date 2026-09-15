"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ListPagination } from "@/components/list-pagination";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  commandLabel,
  formatTimestamp,
  PAGE_SIZE,
  statusTone,
} from "@/lib/format";
import type { Command } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RecentCommands({
  commands,
  deviceId,
}: {
  commands: Command[];
  deviceId: string;
}) {
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () => commands.filter((c) => c.deviceId === deviceId),
    [commands, deviceId],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="flex min-h-72 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-card md:min-h-0 md:flex-1">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-foreground">Recent commands</p>
        <Link
          href="/logs"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View all logs
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none touch-pan-y">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Command</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {commandLabel(row.type)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono text-[10px]",
                      statusTone(row.status) === "signal" &&
                        "border-signal/40 text-signal",
                      statusTone(row.status) === "caution" &&
                        "border-caution/40 text-caution",
                      statusTone(row.status) === "destructive" &&
                        "border-destructive/40 text-destructive",
                    )}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.actorEmail}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatTimestamp(row.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="shrink-0 border-t border-border px-3">
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
