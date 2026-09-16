"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  DoorClosedIcon,
  DoorOpenIcon,
  OctagonXIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { type ComponentType, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDockStore } from "@/lib/dock-store";
import type { CommandType, DeviceState } from "@/lib/types";
import { cn } from "@/lib/utils";

function ActuatorButton({
  type,
  label,
  icon: Icon,
  className,
}: {
  type: CommandType;
  label: string;
  icon: ComponentType<{ className?: string; "data-icon"?: string }>;
  className?: string;
}) {
  const { canCommand, whyBlocked, dispatchCommand } = useDockStore();
  const blocked = whyBlocked(type);
  const enabled = canCommand(type);

  const button = (
    <Button
      variant="outline"
      size="lg"
      className={cn(
        "h-auto min-h-12 w-full flex-col gap-1 py-3 sm:min-h-11 sm:flex-row sm:justify-start sm:py-2.5",
        className,
      )}
      disabled={!enabled}
      onClick={() => {
        if (enabled) dispatchCommand(type);
      }}
    >
      <Icon data-icon="inline-start" />
      <span>{label}</span>
    </Button>
  );

  if (!blocked) return button;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex w-full" />}>
        {button}
      </TooltipTrigger>
      <TooltipContent>{blocked}</TooltipContent>
    </Tooltip>
  );
}

function StateChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "signal" | "caution" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-2">
      <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-xs font-medium",
          tone === "signal" && "text-signal",
          tone === "caution" && "text-caution",
          tone === "muted" && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function actuatorTone(value: string): "signal" | "caution" | "muted" {
  if (value === "MOVING" || value === "UNKNOWN") return "caution";
  return "muted";
}

function ControlPanel({ compact = false }: { compact?: boolean }) {
  const { canCommand, whyBlocked, dispatchCommand, activeState, activeDevice } =
    useDockStore();
  const [abortOpen, setAbortOpen] = useState(false);
  const abortBlocked = whyBlocked("ABORT");
  const moving = activeState.opState === "MOVING";

  return (
    <div className={cn("flex flex-col", compact ? "gap-4" : "gap-4")}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Control panel</p>
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px]",
              moving
                ? "border-caution/40 text-caution"
                : "border-signal/40 text-signal",
            )}
          >
            {activeState.opState}
          </Badge>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          {activeDevice.name} · {activeDevice.serial}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StateChip
          label="Lid"
          value={activeState.lid}
          tone={actuatorTone(activeState.lid)}
        />
        <StateChip
          label="Platform"
          value={activeState.platform}
          tone={actuatorTone(activeState.platform)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Lid
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ActuatorButton type="LID_OPEN" label="Open" icon={DoorOpenIcon} />
          <ActuatorButton
            type="LID_CLOSE"
            label="Close"
            icon={DoorClosedIcon}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Platform
        </p>
        <div className="grid grid-cols-2 gap-2">
          <ActuatorButton
            type="PLATFORM_RAISE"
            label="Raise"
            icon={ArrowUpIcon}
          />
          <ActuatorButton
            type="PLATFORM_LOWER"
            label="Lower"
            icon={ArrowDownIcon}
          />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <Dialog open={abortOpen} onOpenChange={setAbortOpen}>
          <Tooltip>
            <TooltipTrigger
              render={<span className="inline-flex w-full" />}
              disabled={canCommand("ABORT")}
            >
              <DialogTrigger
                render={
                  <Button
                    variant="destructive"
                    size="lg"
                    className="w-full"
                    disabled={!canCommand("ABORT")}
                  />
                }
              >
                <OctagonXIcon data-icon="inline-start" />
                Abort motion
              </DialogTrigger>
            </TooltipTrigger>
            {abortBlocked ? (
              <TooltipContent>{abortBlocked}</TooltipContent>
            ) : null}
          </Tooltip>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Abort motion?</DialogTitle>
              <DialogDescription>
                Stops the in-progress lid or platform move on{" "}
                <span className="font-mono text-foreground">
                  {activeDevice.name}
                </span>
                . Confirm only if you intend to halt the actuator.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                variant="destructive"
                onClick={() => {
                  dispatchCommand("ABORT");
                  setAbortOpen(false);
                }}
              >
                Confirm abort
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {moving ? (
          <p className="mt-2 text-center font-mono text-xs text-caution">
            Actuator moving — wait or abort
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MobileControlBar({ state }: { state: DeviceState }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
      <div className="mb-3 flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-[10px]">
          Lid {state.lid}
        </Badge>
        <Badge variant="outline" className="font-mono text-[10px]">
          Plat {state.platform}
        </Badge>
        {state.opState === "MOVING" ? (
          <Badge
            variant="outline"
            className="ml-auto font-mono text-[10px] border-caution/40 text-caution"
          >
            MOVING
          </Badge>
        ) : null}
      </div>
      <Sheet>
        <SheetTrigger
          render={
            <Button className="h-11 w-full" size="lg" variant="default" />
          }
        >
          <SlidersHorizontalIcon data-icon="inline-start" />
          Open control panel
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85svh] gap-0 rounded-t-2xl p-0"
        >
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle>Control panel</SheetTitle>
            <SheetDescription>
              Command lid and platform actuators for this dock.
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto scrollbar-none px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ControlPanel compact />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ActuatorRail() {
  const { activeState } = useDockStore();

  return (
    <>
      <aside className="hidden w-full shrink-0 md:sticky md:top-0 md:block md:w-72 md:self-start lg:w-80">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <ControlPanel />
        </div>
      </aside>

      <MobileControlBar state={activeState} />
    </>
  );
}
