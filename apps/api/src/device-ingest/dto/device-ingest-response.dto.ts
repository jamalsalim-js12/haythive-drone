import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ChargeStatus,
  Connectivity,
  LidState,
  OpState,
  PlatformState,
  Readiness,
} from "@prisma/client";

export class DeviceIngestResponseDto {
  @ApiProperty()
  deviceId!: string;

  @ApiProperty()
  serial!: string;

  @ApiPropertyOptional({ nullable: true })
  lastHeartbeatAt!: string | null;

  @ApiProperty({ enum: Connectivity })
  connectivity!: Connectivity;

  @ApiProperty({ enum: OpState })
  opState!: OpState;

  @ApiProperty({ enum: LidState })
  lid!: LidState;

  @ApiProperty({ enum: PlatformState })
  platform!: PlatformState;

  @ApiProperty({ enum: ChargeStatus })
  chargeStatus!: ChargeStatus;

  @ApiPropertyOptional({ nullable: true })
  socPercent!: number | null;

  @ApiProperty({ enum: Readiness })
  readiness!: Readiness;

  @ApiProperty()
  updatedAt!: string;
}
