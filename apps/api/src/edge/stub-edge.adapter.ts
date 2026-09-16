import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AuditEntityType,
  CommandStatus,
  CommandType,
  LidState,
  OpState,
  PlatformState,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EdgeAdapter, EdgeCommandDispatch } from "./edge-adapter";

@Injectable()
export class StubEdgeAdapter implements EdgeAdapter, OnModuleDestroy {
  private readonly logger = new Logger(StubEdgeAdapter.name);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleDestroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  async dispatch(command: EdgeCommandDispatch): Promise<void> {
    const motionMs = this.motionMs();
    this.logger.debug(
      `Stub edge accepted ${command.type} for device ${command.deviceId} (ack in ${motionMs}ms)`,
    );

    const existing = this.timers.get(command.commandId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.timers.delete(command.commandId);
      void this.complete(command).catch((error: unknown) => {
        this.logger.error(
          `Stub edge failed to complete command ${command.commandId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
    }, motionMs);

    this.timers.set(command.commandId, timer);
  }

  private async complete(command: EdgeCommandDispatch): Promise<void> {
    const row = await this.prisma.command.findUnique({
      where: { id: command.commandId },
    });

    if (!row || row.status !== CommandStatus.SENT) {
      return;
    }

    const now = new Date();
    const finalLid =
      command.type === CommandType.LID_OPEN
        ? LidState.OPEN
        : command.type === CommandType.LID_CLOSE
          ? LidState.CLOSED
          : undefined;
    const finalPlatform =
      command.type === CommandType.PLATFORM_RAISE
        ? PlatformState.UP
        : command.type === CommandType.PLATFORM_LOWER
          ? PlatformState.DOWN
          : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.command.update({
        where: { id: command.commandId },
        data: {
          status: CommandStatus.ACKED,
          completedAt: now,
          response: {
            source: "stub-edge",
            ackedAt: now.toISOString(),
          } as Prisma.InputJsonValue,
          message: "Stub edge acknowledged command",
        },
      });

      await tx.deviceState.update({
        where: { deviceId: command.deviceId },
        data: {
          opState: OpState.IDLE,
          ...(finalLid !== undefined ? { lid: finalLid } : {}),
          ...(finalPlatform !== undefined ? { platform: finalPlatform } : {}),
        },
      });

      await tx.device.update({
        where: { id: command.deviceId },
        data: { lastHeartbeatAt: now },
      });

      await tx.auditEvent.create({
        data: {
          deviceId: command.deviceId,
          actorId: row.actorId,
          action: "command.acked",
          entityType: AuditEntityType.COMMAND,
          entityId: command.commandId,
          meta: {
            type: command.type,
            source: "stub-edge",
          },
        },
      });
    });
  }

  private motionMs(): number {
    const configured = Number(
      this.config.get<string>("EDGE_STUB_MOTION_MS") ?? 1600,
    );
    return Number.isFinite(configured) && configured >= 0 ? configured : 1600;
  }
}
