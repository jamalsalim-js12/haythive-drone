import { Injectable } from "@nestjs/common";
import { HeartbeatMonitorService } from "../device-ingest/heartbeat-monitor.service";
import { PrismaService } from "../prisma/prisma.service";
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
