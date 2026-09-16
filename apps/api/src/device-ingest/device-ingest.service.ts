import { Injectable, UnauthorizedException } from "@nestjs/common";
import {
  AuditEntityType,
  Connectivity,
  type Device,
  type DeviceState,
  Prisma,
} from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { DeviceIngestDto } from "./dto/device-ingest.dto";
import { DeviceIngestResponseDto } from "./dto/device-ingest-response.dto";

@Injectable()
export class DeviceIngestService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(
    dto: DeviceIngestDto,
    token: string,
  ): Promise<DeviceIngestResponseDto> {
    const serial = dto.serial.trim();
    const device = await this.prisma.device.findUnique({
      where: { serial },
      include: { state: true },
    });

    if (!device?.ingestTokenHash) {
      throw new UnauthorizedException("Invalid serial or ingest token.");
    }

    const valid = await bcrypt.compare(token, device.ingestTokenHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid serial or ingest token.");
    }

    const now = new Date();
    const readinessReasons =
      dto.readinessReasons === undefined
        ? undefined
        : (dto.readinessReasons as unknown as Prisma.InputJsonValue);

    const extras =
      dto.extras === undefined
        ? undefined
        : (dto.extras as Prisma.InputJsonValue);

    const stateData = {
      connectivity: Connectivity.ONLINE,
      ...(dto.opState !== undefined ? { opState: dto.opState } : {}),
      ...(dto.lid !== undefined ? { lid: dto.lid } : {}),
      ...(dto.platform !== undefined ? { platform: dto.platform } : {}),
      ...(dto.chargeStatus !== undefined
        ? { chargeStatus: dto.chargeStatus }
        : {}),
      ...(dto.socPercent !== undefined ? { socPercent: dto.socPercent } : {}),
      ...(dto.readiness !== undefined ? { readiness: dto.readiness } : {}),
      ...(readinessReasons !== undefined ? { readinessReasons } : {}),
      ...(extras !== undefined ? { extras } : {}),
    };

    const [updatedDevice, state] = await this.prisma.$transaction(
      async (tx) => {
        const nextDevice = await tx.device.update({
          where: { id: device.id },
          data: { lastHeartbeatAt: now },
        });

        const nextState = device.state
          ? await tx.deviceState.update({
              where: { deviceId: device.id },
              data: stateData,
            })
          : await tx.deviceState.create({
              data: {
                deviceId: device.id,
                ...stateData,
              },
            });

        await tx.auditEvent.create({
          data: {
            deviceId: device.id,
            action: "device.ingest",
            entityType: AuditEntityType.DEVICE,
            entityId: device.id,
            meta: {
              serial,
              fields: Object.keys(stateData),
            },
          },
        });

        return [nextDevice, nextState] as const;
      },
    );

    return this.toResponse(updatedDevice, state);
  }

  private toResponse(
    device: Device,
    state: DeviceState,
  ): DeviceIngestResponseDto {
    return {
      deviceId: device.id,
      serial: device.serial,
      lastHeartbeatAt: device.lastHeartbeatAt?.toISOString() ?? null,
      connectivity: state.connectivity,
      opState: state.opState,
      lid: state.lid,
      platform: state.platform,
      chargeStatus: state.chargeStatus,
      socPercent: state.socPercent,
      readiness: state.readiness,
      updatedAt: state.updatedAt.toISOString(),
    };
  }
}
