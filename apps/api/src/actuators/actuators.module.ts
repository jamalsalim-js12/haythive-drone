import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DeviceIngestModule } from "../device-ingest/device-ingest.module";
import { EdgeModule } from "../edge/edge.module";
import { ActuatorsController } from "./actuators.controller";
import { ActuatorsService } from "./actuators.service";

@Module({
  imports: [AuthModule, DeviceIngestModule, EdgeModule],
  controllers: [ActuatorsController],
  providers: [ActuatorsService],
})
export class ActuatorsModule {}
