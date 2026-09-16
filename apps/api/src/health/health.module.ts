import { Module } from "@nestjs/common";
import { DeviceIngestModule } from "../device-ingest/device-ingest.module";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [DeviceIngestModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
