export type Connectivity = "ONLINE" | "OFFLINE" | "DEGRADED";
export type OpState = "IDLE" | "MOVING" | "FAULT" | "SERVICE";
export type LidState = "OPEN" | "CLOSED" | "MOVING" | "UNKNOWN";
export type PlatformState = "UP" | "DOWN" | "MOVING" | "UNKNOWN";
export type ChargeStatus =
  | "UNKNOWN"
  | "NOT_CHARGING"
  | "CHARGING"
  | "CHARGED"
  | "FAULT";
export type Readiness = "READY" | "NOT_READY";
export type CommandType =
  | "LID_OPEN"
  | "LID_CLOSE"
  | "PLATFORM_RAISE"
  | "PLATFORM_LOWER"
  | "ABORT";
export type CommandStatus = "PENDING" | "SENT" | "ACKED" | "FAILED" | "TIMEOUT";

export type Device = {
  id: string;
  name: string;
  serial: string;
  siteName: string;
};

export type ReadinessCheck = {
  id: string;
  label: string;
  pass: boolean;
  detail?: string;
};

export type DeviceState = {
  deviceId: string;
  connectivity: Connectivity;
  opState: OpState;
  lid: LidState;
  platform: PlatformState;
  chargeStatus: ChargeStatus;
  socPercent: number;
  readiness: Readiness;
  readinessChecks: ReadinessCheck[];
  lastHeartbeatAt: string;
  updatedAt: string;
};

export type Command = {
  id: string;
  deviceId: string;
  type: CommandType;
  status: CommandStatus;
  actorEmail: string;
  createdAt: string;
  completedAt?: string;
  message?: string;
};

export type AuditEvent = {
  id: string;
  deviceId: string;
  action: string;
  actorEmail: string | null;
  entityType: "command" | "state" | "health" | "auth";
  entityId: string;
  createdAt: string;
  meta?: Record<string, string>;
};

export type FaultEvent = {
  id: string;
  deviceId: string;
  code: string;
  severity: "warning" | "critical";
  message: string;
  resolved: boolean;
  createdAt: string;
};

export type SocPoint = { time: string; soc: number };
export type CommandOutcomePoint = {
  day: string;
  success: number;
  failed: number;
};
export type HeartbeatPoint = { time: string; ageSec: number };
