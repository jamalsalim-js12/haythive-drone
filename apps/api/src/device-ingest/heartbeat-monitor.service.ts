import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Connectivity } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HeartbeatMonitorService {
  private readonly logger = new Logger(HeartbeatMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweepStaleHeartbeats(): Promise<void> {
    const { degradedMs, offlineMs } = this.thresholds();
    const now = Date.now();

    const devices = await this.prisma.device.findMany({
      include: { state: true },
    });

    for (const device of devices) {
      if (!device.state) continue;

      const target = this.connectivityForHeartbeat(
        device.lastHeartbeatAt,
        now,
        degradedMs,
        offlineMs,
      );

      if (target && target !== device.state.connectivity) {
        await this.prisma.deviceState.update({
          where: { deviceId: device.id },
          data: { connectivity: target },
        });
        this.logger.debug(
          `Device ${device.serial} connectivity ${device.state.connectivity} → ${target}`,
        );
      }
    }
  }

  /**
   * Apply stale rules without persisting — used when reading device state.
   */
  projectConnectivity(
    lastHeartbeatAt: Date | null,
    current: Connectivity,
  ): Connectivity {
    const { degradedMs, offlineMs } = this.thresholds();
    return (
      this.connectivityForHeartbeat(
        lastHeartbeatAt,
        Date.now(),
        degradedMs,
        offlineMs,
      ) ?? current
    );
  }

  private connectivityForHeartbeat(
    lastHeartbeatAt: Date | null,
    nowMs: number,
    degradedMs: number,
    offlineMs: number,
  ): Connectivity | null {
    if (!lastHeartbeatAt) {
      return Connectivity.OFFLINE;
    }

    const age = nowMs - lastHeartbeatAt.getTime();
    if (age >= offlineMs) {
      return Connectivity.OFFLINE;
    }
    if (age >= degradedMs) {
      return Connectivity.DEGRADED;
    }
    return Connectivity.ONLINE;
  }

  private thresholds(): { degradedMs: number; offlineMs: number } {
    const degradedMs = Number(
      this.config.get<string>("HEARTBEAT_DEGRADED_MS") ?? 60_000,
    );
    const offlineMs = Number(
      this.config.get<string>("HEARTBEAT_OFFLINE_MS") ?? 180_000,
    );
    return {
      degradedMs: Number.isFinite(degradedMs) ? degradedMs : 60_000,
      offlineMs: Number.isFinite(offlineMs) ? offlineMs : 180_000,
    };
  }
}
