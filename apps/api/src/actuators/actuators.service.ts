import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditEntityType,
  Command,
  CommandStatus,
  CommandType,
  LidState,
  OpState,
  PlatformState,
  Prisma,
} from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { HeartbeatMonitorService } from "../device-ingest/heartbeat-monitor.service";
import { EDGE_ADAPTER, EdgeAdapter } from "../edge/edge-adapter";
import { PrismaService } from "../prisma/prisma.service";
import { CommandResponseDto } from "./dto/command-response.dto";
import { CreateActuatorCommandDto } from "./dto/create-actuator-command.dto";
import { interlockReason } from "./interlocks";

@Injectable()
export class ActuatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly heartbeatMonitor: HeartbeatMonitorService,
    @Inject(EDGE_ADAPTER) private readonly edgeAdapter: EdgeAdapter,
  ) {}

  async createCommand(
    dto: CreateActuatorCommandDto,
    actor: AuthenticatedUser,
  ): Promise<CommandResponseDto> {
    const device = await this.prisma.device.findUnique({
      where: { id: dto.deviceId },
      include: { state: true },
    });

    if (!device) {
      throw new NotFoundException(`Device ${dto.deviceId} not found.`);
    }
    if (!device.state) {
      throw new ConflictException(
        `Device ${dto.deviceId} has no projected state yet.`,
      );
    }

    const connectivity = this.heartbeatMonitor.projectConnectivity(
      device.lastHeartbeatAt,
      device.state.connectivity,
    );
    const blocked = interlockReason(
      {
        connectivity,
        opState: device.state.opState,
        lid: device.state.lid,
        platform: device.state.platform,
      },
      dto.type,
    );
    if (blocked) {
      throw new ConflictException(blocked);
    }

    const requestPayload = {
      deviceId: dto.deviceId,
      type: dto.type,
    } as Prisma.InputJsonValue;

    const command = await this.prisma.$transaction(async (tx) => {
      const created = await tx.command.create({
        data: {
          deviceId: dto.deviceId,
          actorId: actor.id,
          type: dto.type,
          status: CommandStatus.PENDING,
          request: requestPayload,
          message: "Command accepted",
        },
      });

      const sent = await tx.command.update({
        where: { id: created.id },
        data: {
          status: CommandStatus.SENT,
          message: "Dispatched to edge",
        },
      });

      await tx.deviceState.update({
        where: { deviceId: dto.deviceId },
        data: {
          opState: OpState.MOVING,
          ...(isLidCommand(dto.type) ? { lid: LidState.MOVING } : {}),
          ...(isPlatformCommand(dto.type)
            ? { platform: PlatformState.MOVING }
            : {}),
        },
      });

      await tx.auditEvent.create({
        data: {
          deviceId: dto.deviceId,
          actorId: actor.id,
          action: "command.sent",
          entityType: AuditEntityType.COMMAND,
          entityId: sent.id,
          meta: {
            type: dto.type,
          },
        },
      });

      return sent;
    });

    try {
      await this.edgeAdapter.dispatch({
        commandId: command.id,
        deviceId: dto.deviceId,
        type: dto.type,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Edge dispatch failed";
      const failed = await this.markFailed(command.id, dto.deviceId, message);
      return this.toResponse(failed);
    }

    return this.toResponse(command);
  }

  private async markFailed(
    commandId: string,
    deviceId: string,
    message: string,
  ): Promise<Command> {
    return this.prisma.$transaction(async (tx) => {
      const failed = await tx.command.update({
        where: { id: commandId },
        data: {
          status: CommandStatus.FAILED,
          completedAt: new Date(),
          message,
          response: {
            error: message,
          },
        },
      });

      await tx.deviceState.update({
        where: { deviceId },
        data: { opState: OpState.FAULT },
      });

      await tx.auditEvent.create({
        data: {
          deviceId,
          actorId: failed.actorId,
          action: "command.failed",
          entityType: AuditEntityType.COMMAND,
          entityId: commandId,
          meta: { message },
        },
      });

      return failed;
    });
  }

  private toResponse(command: Command): CommandResponseDto {
    return {
      id: command.id,
      deviceId: command.deviceId,
      type: command.type,
      status: command.status,
      actorId: command.actorId,
      message: command.message,
      createdAt: command.createdAt.toISOString(),
      updatedAt: command.updatedAt.toISOString(),
      completedAt: command.completedAt?.toISOString() ?? null,
    };
  }
}

function isLidCommand(type: CommandType): boolean {
  return type === CommandType.LID_OPEN || type === CommandType.LID_CLOSE;
}

function isPlatformCommand(type: CommandType): boolean {
  return (
    type === CommandType.PLATFORM_RAISE || type === CommandType.PLATFORM_LOWER
  );
}
