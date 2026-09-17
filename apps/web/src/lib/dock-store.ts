"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import {
  usePostActuatorsCommands,
  usePostActuatorsCommandsByIdAbort,
} from "@/api/generated/endpoints/actuators/actuators";
import {
  getGetDevicesByIdStateQueryKey,
  useGetDevices,
  useGetDevicesByIdState,
} from "@/api/generated/endpoints/devices/devices";
import { useSession } from "@/hooks/use-session";
import {
  getErrorMessage,
  mapCommand,
  mapDevice,
  mapDeviceState,
} from "@/lib/api-mappers";
import {
  buildCommandOutcomes,
  buildFaults,
  buildHeartbeatSeries,
  buildInitialAudit,
  buildInitialCommands,
  buildSocSeries,
} from "@/lib/dummy/fixtures";
import type {
  AuditEvent,
  Command,
  CommandType,
  Device,
  DeviceState,
  FaultEvent,
} from "@/lib/types";

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";
  return name === "AbortError" || /aborted/i.test(message);
}

type StoreState = {
  activeDeviceId: string | null;
  devices: Device[];
  states: Record<string, DeviceState>;
  commands: Command[];
  audit: AuditEvent[];
  faults: FaultEvent[];
  pendingCommandId: string | null;
};

type DispatchResult =
  | { ok: true; commandId: string }
  | { ok: false; reason: string };

type Listener = () => void;

const API_COMMAND_TYPES = new Set<CommandType>([
  "LID_OPEN",
  "LID_CLOSE",
  "PLATFORM_RAISE",
  "PLATFORM_LOWER",
]);

function cloneState(s: DeviceState): DeviceState {
  return {
    ...s,
    readinessChecks: s.readinessChecks.map((c) => ({ ...c })),
  };
}

function recomputeReadiness(state: DeviceState): DeviceState {
  if (state.readinessChecks.length === 0) {
    return state;
  }

  const checks = state.readinessChecks.map((c) => {
    if (c.id === "connectivity" || c.id === "conn") {
      const pass = state.connectivity === "ONLINE";
      return {
        ...c,
        pass,
        detail: pass
          ? undefined
          : state.connectivity === "DEGRADED"
            ? "Heartbeat stale"
            : "Dock offline",
      };
    }
    if (c.id === "fault") {
      return { ...c, pass: state.opState !== "FAULT", detail: undefined };
    }
    if (c.id === "charge") {
      const pass =
        state.chargeStatus === "CHARGED" ||
        state.chargeStatus === "CHARGING" ||
        (state.socPercent >= 95 && state.chargeStatus !== "FAULT");
      return {
        ...c,
        pass,
        detail: pass
          ? undefined
          : `SOC ${state.socPercent}% — ${state.chargeStatus.toLowerCase().replaceAll("_", " ")}`,
      };
    }
    return c;
  });
  const readiness = checks.every((c) => c.pass) ? "READY" : "NOT_READY";
  return { ...state, readinessChecks: checks, readiness };
}

function interlockReason(state: DeviceState, type: CommandType): string | null {
  if (state.connectivity === "OFFLINE") {
    return "Dock is offline";
  }
  if (state.opState === "FAULT" && type !== "ABORT") {
    return "Dock is in fault — clear before commanding";
  }
  if (state.opState === "SERVICE" && type !== "ABORT") {
    return "Dock is in service mode — commands are disabled";
  }
  if (
    (state.opState === "MOVING" ||
      state.lid === "MOVING" ||
      state.platform === "MOVING") &&
    type !== "ABORT"
  ) {
    return "Motion in progress — abort or wait";
  }
  if (type === "ABORT") {
    return state.opState === "MOVING" ||
      state.lid === "MOVING" ||
      state.platform === "MOVING"
      ? null
      : "Nothing to abort";
  }
  if (type === "LID_CLOSE" && state.platform !== "DOWN") {
    return "Close lid only when platform is down";
  }
  if (type === "PLATFORM_RAISE" && state.lid !== "OPEN") {
    return "Raise platform only when lid is open";
  }
  if (type === "PLATFORM_LOWER" && state.lid !== "OPEN") {
    return "Lower platform only when lid is open";
  }
  if (type === "LID_OPEN" && state.lid === "OPEN") {
    return "Lid is already open";
  }
  if (type === "LID_CLOSE" && state.lid === "CLOSED") {
    return "Lid is already closed";
  }
  if (type === "PLATFORM_RAISE" && state.platform === "UP") {
    return "Platform is already up";
  }
  if (type === "PLATFORM_LOWER" && state.platform === "DOWN") {
    return "Platform is already down";
  }
  return null;
}

function createStore() {
  let state: StoreState = {
    activeDeviceId: null,
    devices: [],
    states: {},
    commands: buildInitialCommands(),
    audit: buildInitialAudit(),
    faults: buildFaults(),
    pendingCommandId: null,
  };

  const listeners = new Set<Listener>();

  function emit() {
    for (const l of listeners) {
      l();
    }
  }

  function getSnapshot() {
    return state;
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function setDevices(devices: Device[]) {
    const activeStillExists = devices.some(
      (d) => d.id === state.activeDeviceId,
    );
    state = {
      ...state,
      devices,
      activeDeviceId: activeStillExists
        ? state.activeDeviceId
        : (devices[0]?.id ?? null),
    };
    emit();
  }

  function hydrateState(deviceState: DeviceState) {
    const pendingId = state.pendingCommandId;
    const motionComplete = Boolean(
      pendingId && deviceState.opState !== "MOVING",
    );

    state = {
      ...state,
      pendingCommandId: motionComplete ? null : pendingId,
      states: {
        ...state.states,
        [deviceState.deviceId]: cloneState(deviceState),
      },
      commands: motionComplete
        ? state.commands.map((c) =>
            c.id === pendingId
              ? {
                  ...c,
                  status: deviceState.opState === "FAULT" ? "FAILED" : "ACKED",
                  completedAt: new Date().toISOString(),
                }
              : c,
          )
        : state.commands,
      audit: motionComplete
        ? [
            {
              id: `aud-${pendingId}-done`,
              deviceId: deviceState.deviceId,
              action:
                deviceState.opState === "FAULT"
                  ? "command.failed"
                  : "command.acked",
              actorEmail: null,
              entityType: "command" as const,
              entityId: pendingId as string,
              createdAt: new Date().toISOString(),
            },
            ...state.audit,
          ]
        : state.audit,
    };
    emit();
  }

  function setActiveDevice(id: string) {
    if (!state.devices.some((d) => d.id === id)) return;
    state = { ...state, activeDeviceId: id };
    emit();
  }

  function getActiveState() {
    const id = state.activeDeviceId;
    return id ? state.states[id] : undefined;
  }

  function canCommand(type: CommandType) {
    const active = getActiveState();
    if (!active) return false;
    return interlockReason(active, type) === null;
  }

  function whyBlocked(type: CommandType) {
    const active = getActiveState();
    if (!active) return "Dock state unavailable";
    return interlockReason(active, type);
  }

  function applySentCommand(command: Command) {
    const current = state.states[command.deviceId];
    let next = current ? cloneState(current) : null;
    if (next) {
      next.opState = "MOVING";
      next.updatedAt = new Date().toISOString();
      if (command.type === "LID_OPEN" || command.type === "LID_CLOSE") {
        next.lid = "MOVING";
      }
      if (
        command.type === "PLATFORM_RAISE" ||
        command.type === "PLATFORM_LOWER"
      ) {
        next.platform = "MOVING";
      }
      next = recomputeReadiness(next);
    }

    const audit: AuditEvent = {
      id: `aud-${command.id}`,
      deviceId: command.deviceId,
      action: "command.sent",
      actorEmail: command.actorEmail,
      entityType: "command",
      entityId: command.id,
      createdAt: new Date().toISOString(),
      meta: { type: command.type },
    };

    state = {
      ...state,
      pendingCommandId: command.id,
      states: next
        ? { ...state.states, [command.deviceId]: next }
        : state.states,
      commands: [command, ...state.commands],
      audit: [audit, ...state.audit],
    };
    emit();
  }

  function applyAbort(abortCommand: Command, abortedCommandId: string) {
    const deviceId = abortCommand.deviceId;
    const current = state.states[deviceId];
    let next = current ? cloneState(current) : null;
    if (next) {
      next.opState = "IDLE";
      next.updatedAt = new Date().toISOString();
      if (next.lid === "MOVING") next.lid = "UNKNOWN";
      if (next.platform === "MOVING") next.platform = "UNKNOWN";
      next = recomputeReadiness(next);
    }

    state = {
      ...state,
      pendingCommandId: null,
      states: next ? { ...state.states, [deviceId]: next } : state.states,
      commands: [
        abortCommand,
        ...state.commands.map((c) =>
          c.id === abortedCommandId
            ? {
                ...c,
                status: "FAILED" as const,
                completedAt: new Date().toISOString(),
                message: abortCommand.message,
              }
            : c,
        ),
      ],
      audit: [
        {
          id: `aud-${abortCommand.id}`,
          deviceId,
          action: "command.aborted",
          actorEmail: abortCommand.actorEmail,
          entityType: "command" as const,
          entityId: abortedCommandId,
          createdAt: new Date().toISOString(),
          meta: { abortCommandId: abortCommand.id },
        },
        ...state.audit,
      ],
    };
    emit();
  }

  return {
    getSnapshot,
    subscribe,
    setDevices,
    hydrateState,
    setActiveDevice,
    canCommand,
    whyBlocked,
    applySentCommand,
    applyAbort,
    getActiveDeviceId: () => state.activeDeviceId,
    getPendingCommandId: () => state.pendingCommandId,
    getLatestSentCommandId: () =>
      state.commands.find((c) => c.status === "SENT")?.id ?? null,
    getSocSeries: (deviceId: string) => buildSocSeries(deviceId),
    getCommandOutcomes: () => buildCommandOutcomes(),
    getHeartbeatSeries: (deviceId: string) => buildHeartbeatSeries(deviceId),
  };
}

const store = createStore();

const EMPTY_STATE: DeviceState = {
  deviceId: "",
  connectivity: "OFFLINE",
  opState: "IDLE",
  lid: "UNKNOWN",
  platform: "UNKNOWN",
  chargeStatus: "UNKNOWN",
  socPercent: 0,
  readiness: "NOT_READY",
  readinessChecks: [],
  lastHeartbeatAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

export function useDockStore() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const actorEmail = session?.email ?? "operator@haythive.local";
  const commandMutation = usePostActuatorsCommands();
  const abortMutation = usePostActuatorsCommandsByIdAbort();

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  const devicesQuery = useGetDevices({
    query: {
      refetchInterval: 10_000,
    },
  });

  const devices =
    devicesQuery.data?.status === 200
      ? devicesQuery.data.data.map(mapDevice)
      : snapshot.devices;

  useEffect(() => {
    if (devicesQuery.data?.status === 200) {
      store.setDevices(devicesQuery.data.data.map(mapDevice));
    }
  }, [devicesQuery.data]);

  const activeDeviceId = snapshot.activeDeviceId ?? devices[0]?.id ?? "";

  const stateQuery = useGetDevicesByIdState(activeDeviceId, {
    query: {
      enabled: Boolean(activeDeviceId),
      // Keep polling during motion so stub edge ACKs hydrate the UI.
      refetchInterval: 1_500,
      // Avoid flashing a hard error while the previous dock's in-flight
      // poll is aborted on switch.
      placeholderData: (previous) => previous,
      retry: (failureCount, error) => {
        if (isAbortError(error)) return false;
        return failureCount < 2;
      },
    },
  });

  useEffect(() => {
    if (stateQuery.data?.status === 200) {
      store.hydrateState(mapDeviceState(stateQuery.data.data));
    }
  }, [stateQuery.data]);

  async function dispatchCommand(type: CommandType): Promise<DispatchResult> {
    if (type === "ABORT") {
      const blocked = store.whyBlocked("ABORT");
      if (blocked) return { ok: false, reason: blocked };

      const abortedCommandId =
        store.getPendingCommandId() ?? store.getLatestSentCommandId();
      if (!abortedCommandId) {
        return { ok: false, reason: "No active command to abort" };
      }

      const deviceId = store.getActiveDeviceId() ?? activeDeviceId;
      try {
        const response = await abortMutation.mutateAsync({
          id: abortedCommandId,
          data: { reason: "Operator aborted motion" },
        });

        if (response.status !== 200) {
          return { ok: false, reason: "Abort was rejected" };
        }

        store.applyAbort(
          mapCommand(response.data, actorEmail),
          abortedCommandId,
        );
        if (deviceId) {
          await queryClient.invalidateQueries({
            queryKey: getGetDevicesByIdStateQueryKey(deviceId),
          });
        }
        return { ok: true, commandId: response.data.id };
      } catch (error: unknown) {
        return {
          ok: false,
          reason: getErrorMessage(error) ?? "Abort failed",
        };
      }
    }

    if (!API_COMMAND_TYPES.has(type)) {
      return { ok: false, reason: "Unsupported command" };
    }

    const deviceId = store.getActiveDeviceId() ?? activeDeviceId;
    if (!deviceId) return { ok: false, reason: "No dock selected" };

    const blocked = store.whyBlocked(type);
    if (blocked) return { ok: false, reason: blocked };

    try {
      const response = await commandMutation.mutateAsync({
        data: {
          deviceId,
          type: type as
            | "LID_OPEN"
            | "LID_CLOSE"
            | "PLATFORM_RAISE"
            | "PLATFORM_LOWER",
        },
      });

      if (response.status !== 201) {
        return { ok: false, reason: "Command was rejected" };
      }

      store.applySentCommand(mapCommand(response.data, actorEmail));
      await queryClient.invalidateQueries({
        queryKey: getGetDevicesByIdStateQueryKey(deviceId),
      });
      return { ok: true, commandId: response.data.id };
    } catch (error: unknown) {
      return {
        ok: false,
        reason: getErrorMessage(error) ?? "Command failed",
      };
    }
  }

  const activeDevice =
    devices.find((d) => d.id === activeDeviceId) ?? devices[0];
  const activeState =
    (activeDeviceId ? snapshot.states[activeDeviceId] : undefined) ??
    EMPTY_STATE;

  const faults: FaultEvent[] = snapshot.faults.filter(
    (f) => !activeDeviceId || f.deviceId === activeDeviceId,
  );

  const stateDeviceId =
    stateQuery.data?.status === 200
      ? stateQuery.data.data.deviceId
      : undefined;
  const isSwitchingDock =
    Boolean(activeDeviceId) &&
    (stateQuery.isPending || stateQuery.isFetching) &&
    stateDeviceId !== activeDeviceId;

  const devicesFailed =
    devicesQuery.isError && !isAbortError(devicesQuery.error);
  const stateFailed =
    stateQuery.isError &&
    !isAbortError(stateQuery.error) &&
    !isSwitchingDock;

  return {
    devices,
    activeDevice: activeDevice ?? {
      id: "",
      name: "No dock",
      serial: "—",
      siteName: "—",
    },
    activeDeviceId,
    activeState,
    commands: snapshot.commands,
    audit: snapshot.audit,
    faults,
    pendingCommandId: snapshot.pendingCommandId,
    isCommandPending: commandMutation.isPending || abortMutation.isPending,
    isAbortPending: abortMutation.isPending,
    setActiveDevice: store.setActiveDevice,
    canCommand: store.canCommand,
    whyBlocked: store.whyBlocked,
    dispatchCommand,
    socSeries: store.getSocSeries(activeDeviceId || "unknown"),
    commandOutcomes: store.getCommandOutcomes(),
    heartbeatSeries: store.getHeartbeatSeries(activeDeviceId || "unknown"),
    isLoading: devicesQuery.isLoading || stateQuery.isLoading,
    isSwitchingDock,
    isError: devicesFailed || stateFailed,
    errorMessage:
      getErrorMessage(devicesQuery.error) ?? getErrorMessage(stateQuery.error),
  };
}
