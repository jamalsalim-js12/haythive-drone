"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  useGetDevices,
  useGetDevicesByIdState,
} from "@/api/generated/endpoints/devices/devices";
import { getErrorMessage, mapDevice, mapDeviceState } from "@/lib/api-mappers";
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

const MOTION_MS = 1600;

type StoreState = {
  activeDeviceId: string | null;
  devices: Device[];
  states: Record<string, DeviceState>;
  commands: Command[];
  audit: AuditEvent[];
  faults: FaultEvent[];
  pendingCommandId: string | null;
  motionTimer: ReturnType<typeof setTimeout> | null;
};

type Listener = () => void;

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
  if (state.opState === "MOVING" && type !== "ABORT") {
    return "Motion in progress — abort or wait";
  }
  if (type === "ABORT") {
    return state.opState === "MOVING" ? null : "Nothing to abort";
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
    motionTimer: null,
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
    if (state.pendingCommandId) return;
    state = {
      ...state,
      states: {
        ...state.states,
        [deviceState.deviceId]: cloneState(deviceState),
      },
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

  function finishMotion(
    commandId: string,
    deviceId: string,
    type: CommandType,
    success: boolean,
  ) {
    const prev = state.states[deviceId];
    if (!prev) return;

    let next = cloneState(prev);
    next.opState = success ? "IDLE" : "FAULT";
    next.updatedAt = new Date().toISOString();
    next.lastHeartbeatAt = new Date().toISOString();

    if (success) {
      if (type === "LID_OPEN") next.lid = "OPEN";
      if (type === "LID_CLOSE") next.lid = "CLOSED";
      if (type === "PLATFORM_RAISE") next.platform = "UP";
      if (type === "PLATFORM_LOWER") next.platform = "DOWN";
      if (type === "ABORT") {
        if (next.lid === "MOVING") next.lid = "UNKNOWN";
        if (next.platform === "MOVING") next.platform = "UNKNOWN";
      }
    }

    next = recomputeReadiness(next);

    state = {
      ...state,
      pendingCommandId: null,
      motionTimer: null,
      states: { ...state.states, [deviceId]: next },
      commands: state.commands.map((c) =>
        c.id === commandId
          ? {
              ...c,
              status: success ? "ACKED" : "FAILED",
              completedAt: new Date().toISOString(),
              message: success ? undefined : "Simulated fault",
            }
          : c,
      ),
      audit: [
        {
          id: `aud-${commandId}-done`,
          deviceId,
          action: success ? "command.acked" : "command.failed",
          actorEmail: "operator@haythive.local",
          entityType: "command" as const,
          entityId: commandId,
          createdAt: new Date().toISOString(),
          meta: { type },
        },
        ...state.audit,
      ],
    };
    emit();
  }

  function dispatchCommand(type: CommandType) {
    const deviceId = state.activeDeviceId;
    if (!deviceId) return { ok: false as const, reason: "No dock selected" };
    const current = state.states[deviceId];
    if (!current)
      return { ok: false as const, reason: "Dock state unavailable" };
    const blocked = interlockReason(current, type);
    if (blocked) return { ok: false as const, reason: blocked };

    if (state.motionTimer) {
      clearTimeout(state.motionTimer);
    }

    const commandId = `cmd-${Date.now()}`;
    const command: Command = {
      id: commandId,
      deviceId,
      type,
      status: "SENT",
      actorEmail: "operator@haythive.local",
      createdAt: new Date().toISOString(),
    };

    let next = cloneState(current);
    next.opState = type === "ABORT" ? "IDLE" : "MOVING";
    next.updatedAt = new Date().toISOString();

    if (type === "LID_OPEN" || type === "LID_CLOSE") next.lid = "MOVING";
    if (type === "PLATFORM_RAISE" || type === "PLATFORM_LOWER") {
      next.platform = "MOVING";
    }
    if (type === "ABORT") {
      if (next.lid === "MOVING") next.lid = "UNKNOWN";
      if (next.platform === "MOVING") next.platform = "UNKNOWN";
    }

    next = recomputeReadiness(next);

    const audit: AuditEvent = {
      id: `aud-${commandId}`,
      deviceId,
      action: `command.${type.toLowerCase()}`,
      actorEmail: "operator@haythive.local",
      entityType: "command",
      entityId: commandId,
      createdAt: new Date().toISOString(),
    };

    if (type === "ABORT") {
      state = {
        ...state,
        pendingCommandId: null,
        motionTimer: null,
        states: { ...state.states, [deviceId]: next },
        commands: [
          {
            ...command,
            status: "ACKED",
            completedAt: new Date().toISOString(),
          },
          ...state.commands,
        ],
        audit: [audit, ...state.audit],
      };
      emit();
      return { ok: true as const, commandId };
    }

    const timer = setTimeout(() => {
      finishMotion(commandId, deviceId, type, true);
    }, MOTION_MS);

    state = {
      ...state,
      pendingCommandId: commandId,
      motionTimer: timer,
      states: { ...state.states, [deviceId]: next },
      commands: [command, ...state.commands],
      audit: [audit, ...state.audit],
    };
    emit();
    return { ok: true as const, commandId };
  }

  return {
    getSnapshot,
    subscribe,
    setDevices,
    hydrateState,
    setActiveDevice,
    canCommand,
    whyBlocked,
    dispatchCommand,
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
      refetchInterval: snapshot.pendingCommandId ? false : 2_500,
    },
  });

  useEffect(() => {
    if (stateQuery.data?.status === 200) {
      store.hydrateState(mapDeviceState(stateQuery.data.data));
    }
  }, [stateQuery.data]);

  const activeDevice =
    devices.find((d) => d.id === activeDeviceId) ?? devices[0];
  const activeState =
    (activeDeviceId ? snapshot.states[activeDeviceId] : undefined) ??
    EMPTY_STATE;

  const faults: FaultEvent[] = snapshot.faults.filter(
    (f) => !activeDeviceId || f.deviceId === activeDeviceId,
  );

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
    setActiveDevice: store.setActiveDevice,
    canCommand: store.canCommand,
    whyBlocked: store.whyBlocked,
    dispatchCommand: store.dispatchCommand,
    socSeries: store.getSocSeries(activeDeviceId || "unknown"),
    commandOutcomes: store.getCommandOutcomes(),
    heartbeatSeries: store.getHeartbeatSeries(activeDeviceId || "unknown"),
    isLoading: devicesQuery.isLoading || stateQuery.isLoading,
    isError: devicesQuery.isError || stateQuery.isError,
    errorMessage:
      getErrorMessage(devicesQuery.error) ?? getErrorMessage(stateQuery.error),
  };
}
