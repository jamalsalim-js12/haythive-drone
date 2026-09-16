import { Injectable } from "@nestjs/common";
import { Connectivity } from "@prisma/client";
import { HeartbeatMonitorService } from "../device-ingest/heartbeat-monitor.service";
import { PrismaService } from "../prisma/prisma.service";
import { HealthResponseDto } from "./dto/health-response.dto";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly heartbeatMonitor: HeartbeatMonitorService,
  ) {}

  async check(): Promise<HealthResponseDto> {
    let database: HealthResponseDto["database"] = "up";

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }

    const devices = await this.prisma.device.findMany({
      include: { state: true },
    });

    const summary = { online: 0, degraded: 0, offline: 0 };
    for (const device of devices) {
      const connectivity = this.heartbeatMonitor.projectConnectivity(
        device.lastHeartbeatAt,
        device.state?.connectivity ?? Connectivity.OFFLINE,
      );
      if (connectivity === Connectivity.ONLINE) summary.online += 1;
      else if (connectivity === Connectivity.DEGRADED) summary.degraded += 1;
      else summary.offline += 1;
    }

    return {
      status: database === "up" ? "ok" : "degraded",
      database,
      devices: summary,
      timestamp: new Date().toISOString(),
    };
  }
}
