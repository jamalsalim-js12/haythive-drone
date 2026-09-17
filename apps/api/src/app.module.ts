import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ActuatorsModule } from "./actuators/actuators.module";
import { AuthModule } from "./auth/auth.module";
import { DeviceIngestModule } from "./device-ingest/device-ingest.module";
import { DevicesModule } from "./devices/devices.module";
import { EdgeModule } from "./edge/edge.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EdgeModule,
    AuthModule,
    UsersModule,
    DeviceIngestModule,
    DevicesModule,
    ActuatorsModule,
    HealthModule,
  ],
})
export class AppModule {}
