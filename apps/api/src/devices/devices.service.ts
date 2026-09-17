import { Injectable, NotFoundException } from "@nestjs/common";
import { HeartbeatMonitorService } from "../device-ingest/heartbeat-monitor.service";
import { PrismaService } from "../prisma/prisma.service";
import { DeviceAuditEventResponseDto } from "./dto/device-audit-event-response.dto";
import { DeviceCommandResponseDto } from "./dto/device-command-response.dto";
import { DeviceFaultResponseDto } from "./dto/device-fault-response.dto";
import { DeviceResponseDto } from "./dto/device-response.dto";
import {
  DeviceStateResponseDto,
  ReadinessReasonDto,
} from "./dto/device-state-response.dto";

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly heartbeatMonitor: HeartbeatMonitorService,
  ) {}

  async findAll(): Promise<DeviceResponseDto[]> {
    const devices = await this.prisma.device.findMany({
      include: { site: true },
      orderBy: { name: "asc" },
    });

    return devices.map((device) => this.toDeviceResponse(device));
  }

  async findById(id: string): Promise<DeviceResponseDto | null> {
    const device = await this.prisma.device.findUnique({
      where: { id },
      include: { site: true },
    });

    return device ? this.toDeviceResponse(device) : null;
  }

  async findStateByDeviceId(
    deviceId: string,
  ): Promise<DeviceStateResponseDto | null> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { state: true },
    });

    if (!device?.state) {
      return null;
    }

    return this.toStateResponse(
      device.id,
      device.lastHeartbeatAt,
      device.state,
    );
  }

  async assertDeviceExists(deviceId: string): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true },
    });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found.`);
    }
  }

  async findCommandsByDeviceId(
    deviceId: string,
  ): Promise<DeviceCommandResponseDto[]> {
    await this.assertDeviceExists(deviceId);
    const commands = await this.prisma.command.findMany({
      where: { deviceId },
      include: { actor: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return commands.map((command) => ({
      id: command.id,
      deviceId: command.deviceId,
      type: command.type,
      status: command.status,
      actorEmail: command.actor?.email ?? null,
      message: command.message,
      createdAt: command.createdAt.toISOString(),
      completedAt: command.completedAt?.toISOString() ?? null,
    }));
  }

  async findAuditByDeviceId(
    deviceId: string,
  ): Promise<DeviceAuditEventResponseDto[]> {
    await this.assertDeviceExists(deviceId);
    const events = await this.prisma.auditEvent.findMany({
      where: { deviceId },
      include: { actor: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return events.map((event) => ({
      id: event.id,
      deviceId: event.deviceId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      actorEmail: event.actor?.email ?? null,
      meta:
        event.meta &&
        typeof event.meta === "object" &&
        !Array.isArray(event.meta)
          ? (event.meta as Record<string, unknown>)
          : null,
      createdAt: event.createdAt.toISOString(),
    }));
  }

  async findFaultsByDeviceId(
    deviceId: string,
  ): Promise<DeviceFaultResponseDto[]> {
    await this.assertDeviceExists(deviceId);
    const faults = await this.prisma.fault.findMany({
      where: { deviceId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return faults.map((fault) => ({
      id: fault.id,
      deviceId: fault.deviceId,
      code: fault.code,
      severity: fault.severity,
      message: fault.message,
      resolved: fault.resolved,
      createdAt: fault.createdAt.toISOString(),
    }));
  }

  private toDeviceResponse(device: {
    id: string;
    name: string;
    serial: string;
    lastHeartbeatAt: Date | null;
    site: { name: string } | null;
  }): DeviceResponseDto {
    return {
      id: device.id,
      name: device.name,
      serial: device.serial,
      siteName: device.site?.name ?? null,
      lastHeartbeatAt: device.lastHeartbeatAt?.toISOString() ?? null,
    };
  }

  private toStateResponse(
    deviceId: string,
    lastHeartbeatAt: Date | null,
    state: {
      connectivity: DeviceStateResponseDto["connectivity"];
      opState: DeviceStateResponseDto["opState"];
      lid: DeviceStateResponseDto["lid"];
      platform: DeviceStateResponseDto["platform"];
      chargeStatus: DeviceStateResponseDto["chargeStatus"];
      socPercent: number | null;
      readiness: DeviceStateResponseDto["readiness"];
      readinessReasons: unknown;
      updatedAt: Date;
    },
  ): DeviceStateResponseDto {
    return {
      deviceId,
      connectivity: this.heartbeatMonitor.projectConnectivity(
        lastHeartbeatAt,
        state.connectivity,
      ),
      opState: state.opState,
      lid: state.lid,
      platform: state.platform,
      chargeStatus: state.chargeStatus,
      socPercent: state.socPercent,
      readiness: state.readiness,
      readinessReasons: this.parseReadinessReasons(state.readinessReasons),
      lastHeartbeatAt: lastHeartbeatAt?.toISOString() ?? null,
      updatedAt: state.updatedAt.toISOString(),
    };
  }

  private parseReadinessReasons(value: unknown): ReadinessReasonDto[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (
        item &&
        typeof item === "object" &&
        "id" in item &&
        "label" in item &&
        "pass" in item &&
        typeof (item as { id: unknown }).id === "string" &&
        typeof (item as { label: unknown }).label === "string" &&
        typeof (item as { pass: unknown }).pass === "boolean"
      ) {
        const reason = item as {
          id: string;
          label: string;
          pass: boolean;
          detail?: unknown;
        };
        return [
          {
            id: reason.id,
            label: reason.label,
            pass: reason.pass,
            detail:
              typeof reason.detail === "string" ? reason.detail : undefined,
          },
        ];
      }
      return [];
    });
  }
}
