import { Module } from "@nestjs/common";
import { DeviceIngestController } from "./device-ingest.controller";
import { DeviceIngestService } from "./device-ingest.service";
import { HeartbeatMonitorService } from "./heartbeat-monitor.service";

@Module({
  controllers: [DeviceIngestController],
  providers: [DeviceIngestService, HeartbeatMonitorService],
  exports: [DeviceIngestService, HeartbeatMonitorService],
})
export class DeviceIngestModule {}
