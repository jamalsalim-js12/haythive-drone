import type {
  AuditEvent,
  Command,
  CommandOutcomePoint,
  Device,
  DeviceState,
  FaultEvent,
  HeartbeatPoint,
  SocPoint,
} from "@/lib/types";

const now = Date.now();

function minutesAgo(m: number) {
  return new Date(now - m * 60_000).toISOString();
}

function hoursAgo(h: number) {
  return new Date(now - h * 3_600_000).toISOString();
}

export const devices: Device[] = [
  {
    id: "dock-alpha",
    name: "Dock Alpha",
    serial: "HH-DK-001",
    siteName: "Hangar North",
  },
  {
    id: "dock-beta",
    name: "Dock Beta",
    serial: "HH-DK-002",
    siteName: "Hangar North",
  },
];

export const initialStates: Record<string, DeviceState> = {
  "dock-alpha": {
    deviceId: "dock-alpha",
    connectivity: "ONLINE",
    opState: "IDLE",
    lid: "CLOSED",
    platform: "DOWN",
    chargeStatus: "CHARGING",
    socPercent: 78,
    readiness: "NOT_READY",
    readinessChecks: [
      { id: "conn", label: "Dock online", pass: true },
      { id: "fault", label: "No active fault", pass: true },
      {
        id: "charge",
        label: "Charge complete",
        pass: false,
        detail: "SOC 78% — still charging",
      },
      { id: "lid", label: "Lid closed for storage", pass: true },
      { id: "platform", label: "Platform down", pass: true },
    ],
    lastHeartbeatAt: minutesAgo(0.2),
    updatedAt: minutesAgo(0.2),
  },
  "dock-beta": {
    deviceId: "dock-beta",
    connectivity: "DEGRADED",
    opState: "IDLE",
    lid: "OPEN",
    platform: "UP",
    chargeStatus: "CHARGED",
    socPercent: 96,
    readiness: "READY",
    readinessChecks: [
      {
        id: "conn",
        label: "Dock online",
        pass: false,
        detail: "Heartbeat stale (42s)",
      },
      { id: "fault", label: "No active fault", pass: true },
      { id: "charge", label: "Charge complete", pass: true },
      { id: "lid", label: "Lid open for access", pass: true },
      { id: "platform", label: "Platform raised", pass: true },
    ],
    lastHeartbeatAt: minutesAgo(0.7),
    updatedAt: minutesAgo(0.7),
  },
};

const commandTypes = [
  "LID_OPEN",
  "LID_CLOSE",
  "PLATFORM_RAISE",
  "PLATFORM_LOWER",
  "ABORT",
] as const;

const commandStatuses = [
  "ACKED",
  "ACKED",
  "ACKED",
  "FAILED",
  "TIMEOUT",
] as const;

export function buildInitialCommands(): Command[] {
  const items: Command[] = [];
  for (let i = 0; i < 48; i++) {
    const deviceId = i % 5 === 0 ? "dock-beta" : "dock-alpha";
    const type = commandTypes[i % commandTypes.length];
    const status = commandStatuses[i % commandStatuses.length];
    items.push({
      id: `cmd-${String(i + 1).padStart(3, "0")}`,
      deviceId,
      type,
      status,
      actorEmail: i % 7 === 0 ? "tech@ioteedom.com" : "ops@haythive.com",
      createdAt: minutesAgo(i * 17 + 3),
      completedAt: minutesAgo(i * 17),
      message:
        status === "FAILED"
          ? "Interlock rejected"
          : status === "TIMEOUT"
            ? "Edge ack timeout"
            : undefined,
    });
  }
  return items;
}

export function buildInitialAudit(): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const [i, c] of buildInitialCommands().entries()) {
    events.push({
      id: `aud-${c.id}`,
      deviceId: c.deviceId,
      action: `command.${c.type.toLowerCase()}`,
      actorEmail: c.actorEmail,
      entityType: "command",
      entityId: c.id,
      createdAt: c.createdAt,
      meta: { status: c.status },
    });
    if (i % 4 === 0) {
      events.push({
        id: `aud-state-${i}`,
        deviceId: c.deviceId,
        action: "state.transition",
        actorEmail: null,
        entityType: "state",
        entityId: c.deviceId,
        createdAt: minutesAgo(i * 17 + 1),
        meta: { from: "MOVING", to: "IDLE" },
      });
    }
  }
  return events;
}

export function buildFaults(): FaultEvent[] {
  return [
    {
      id: "flt-001",
      deviceId: "dock-beta",
      code: "HB_STALE",
      severity: "warning",
      message: "Heartbeat age exceeded 30s threshold",
      resolved: false,
      createdAt: minutesAgo(12),
    },
    {
      id: "flt-002",
      deviceId: "dock-alpha",
      code: "LID_OBSTRUCT",
      severity: "critical",
      message: "Lid obstruction detected during close — aborted",
      resolved: true,
      createdAt: hoursAgo(6),
    },
    {
      id: "flt-003",
      deviceId: "dock-alpha",
      code: "CHG_TEMP",
      severity: "warning",
      message: "Charge pad temperature elevated",
      resolved: true,
      createdAt: hoursAgo(18),
    },
    {
      id: "flt-004",
      deviceId: "dock-beta",
      code: "PLT_LIMIT",
      severity: "critical",
      message: "Platform travel limit switch trip",
      resolved: true,
      createdAt: hoursAgo(30),
    },
    {
      id: "flt-005",
      deviceId: "dock-alpha",
      code: "EDGE_RECONNECT",
      severity: "warning",
      message: "Edge controller reconnected after brief dropout",
      resolved: true,
      createdAt: hoursAgo(48),
    },
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `flt-gen-${i + 6}`,
      deviceId: i % 2 === 0 ? "dock-alpha" : "dock-beta",
      code: i % 3 === 0 ? "COMM_GLITCH" : "SENSOR_NOISE",
      severity: (i % 4 === 0 ? "critical" : "warning") as
        | "critical"
        | "warning",
      message:
        i % 3 === 0
          ? "Transient MQTT disconnect (auto-recovered)"
          : "Lid position sensor noise spike",
      resolved: true,
      createdAt: hoursAgo(50 + i * 5),
    })),
  ];
}

export function buildSocSeries(deviceId: string): SocPoint[] {
  const base = deviceId === "dock-alpha" ? 55 : 88;
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}:00`,
    soc: Math.min(
      100,
      Math.round(
        base + i * (deviceId === "dock-alpha" ? 1.1 : 0.3) + (i % 3) * 0.5,
      ),
    ),
  }));
}

export function buildCommandOutcomes(): CommandOutcomePoint[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, i) => ({
    day,
    success: 8 + ((i * 3) % 7),
    failed: i % 3,
  }));
}

export function buildHeartbeatSeries(deviceId: string): HeartbeatPoint[] {
  const base = deviceId === "dock-beta" ? 18 : 2;
  return Array.from({ length: 30 }, (_, i) => ({
    time: `${String(i).padStart(2, "0")}m`,
    ageSec: Math.max(
      1,
      Math.round(
        base + Math.sin(i / 3) * (deviceId === "dock-beta" ? 12 : 1.5),
      ),
    ),
  }));
}
