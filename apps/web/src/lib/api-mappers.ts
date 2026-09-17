import type { CommandResponseDto } from "@/api/generated/models/commandResponseDto";
import type { DeviceAuditEventResponseDto } from "@/api/generated/models/deviceAuditEventResponseDto";
import type { DeviceCommandResponseDto } from "@/api/generated/models/deviceCommandResponseDto";
import type { DeviceFaultResponseDto } from "@/api/generated/models/deviceFaultResponseDto";
import type { DeviceResponseDto } from "@/api/generated/models/deviceResponseDto";
import type { DeviceStateResponseDto } from "@/api/generated/models/deviceStateResponseDto";
import type {
  AuditEvent,
  ChargeStatus,
  Command,
  CommandStatus,
  CommandType,
  Connectivity,
  Device,
  DeviceState,
  FaultEvent,
  LidState,
  OpState,
  PlatformState,
  Readiness,
  ReadinessCheck,
} from "@/lib/types";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function mapDevice(dto: DeviceResponseDto): Device {
  return {
    id: dto.id,
    name: dto.name,
    serial: dto.serial,
    siteName: asString(dto.siteName, "Unassigned"),
  };
}

export function mapDeviceState(dto: DeviceStateResponseDto): DeviceState {
  const readinessChecks: ReadinessCheck[] = (dto.readinessReasons ?? []).map(
    (reason) => ({
      id: reason.id,
      label: reason.label,
      pass: reason.pass,
      detail: reason.detail,
    }),
  );

  return {
    deviceId: dto.deviceId,
    connectivity: dto.connectivity as Connectivity,
    opState: dto.opState as OpState,
    lid: dto.lid as LidState,
    platform: dto.platform as PlatformState,
    chargeStatus: dto.chargeStatus as ChargeStatus,
    socPercent: asNumber(dto.socPercent, 0),
    readiness: dto.readiness as Readiness,
    readinessChecks,
    lastHeartbeatAt: asString(dto.lastHeartbeatAt, new Date(0).toISOString()),
    updatedAt: dto.updatedAt,
  };
}

export function mapCommand(
  dto: CommandResponseDto,
  actorEmail: string,
): Command {
  return {
    id: dto.id,
    deviceId: dto.deviceId,
    type: dto.type as CommandType,
    status: dto.status as CommandStatus,
    actorEmail,
    createdAt: dto.createdAt,
    completedAt: asString(dto.completedAt) || undefined,
    message: asString(dto.message) || undefined,
  };
}

export function mapDeviceCommand(dto: DeviceCommandResponseDto): Command {
  return {
    id: dto.id,
    deviceId: dto.deviceId,
    type: dto.type as CommandType,
    status: dto.status as CommandStatus,
    actorEmail: asString(dto.actorEmail, "system"),
    createdAt: dto.createdAt,
    completedAt: asString(dto.completedAt) || undefined,
    message: asString(dto.message) || undefined,
  };
}

export function mapDeviceAudit(dto: DeviceAuditEventResponseDto): AuditEvent {
  const raw = String(dto.entityType ?? "command").toLowerCase();
  const entityType = (
    ["command", "state", "health", "auth"].includes(raw) ? raw : "command"
  ) as AuditEvent["entityType"];

  return {
    id: dto.id,
    deviceId: asString(dto.deviceId),
    action: dto.action,
    actorEmail:
      typeof dto.actorEmail === "string" ? dto.actorEmail : null,
    entityType,
    entityId: dto.entityId,
    createdAt: dto.createdAt,
    meta:
      dto.meta && typeof dto.meta === "object"
        ? Object.fromEntries(
            Object.entries(dto.meta).map(([key, value]) => [
              key,
              String(value),
            ]),
          )
        : undefined,
  };
}

export function mapDeviceFault(dto: DeviceFaultResponseDto): FaultEvent {
  return {
    id: dto.id,
    deviceId: dto.deviceId,
    code: dto.code,
    severity: dto.severity === "CRITICAL" ? "critical" : "warning",
    message: dto.message,
    resolved: dto.resolved,
    createdAt: dto.createdAt,
  };
}

export function getErrorMessage(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return undefined;
}
