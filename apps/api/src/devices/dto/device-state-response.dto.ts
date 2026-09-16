import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ChargeStatus,
  Connectivity,
  LidState,
  OpState,
  PlatformState,
  Readiness,
} from "@prisma/client";
import { ReadinessReasonDto } from "../../common/dto/readiness-reason.dto";

export { ReadinessReasonDto };

export class DeviceStateResponseDto {
  @ApiProperty({ example: "clxdevice001" })
  deviceId!: string;

  @ApiProperty({ enum: Connectivity, example: Connectivity.ONLINE })
  connectivity!: Connectivity;

  @ApiProperty({ enum: OpState, example: OpState.IDLE })
  opState!: OpState;

  @ApiProperty({ enum: LidState, example: LidState.CLOSED })
  lid!: LidState;

  @ApiProperty({ enum: PlatformState, example: PlatformState.DOWN })
  platform!: PlatformState;

  @ApiProperty({ enum: ChargeStatus, example: ChargeStatus.CHARGING })
  chargeStatus!: ChargeStatus;

  @ApiPropertyOptional({
    description: "State of charge percent from edge when available.",
    example: 86,
    nullable: true,
  })
  socPercent!: number | null;

  @ApiProperty({ enum: Readiness, example: Readiness.NOT_READY })
  readiness!: Readiness;

  @ApiProperty({ type: ReadinessReasonDto, isArray: true })
  readinessReasons!: ReadinessReasonDto[];

  @ApiPropertyOptional({
    description: "ISO-8601 timestamp of the last edge heartbeat.",
    example: "2026-09-16T10:00:00.000Z",
    nullable: true,
  })
  lastHeartbeatAt!: string | null;

  @ApiProperty({ example: "2026-09-16T10:00:00.000Z" })
  updatedAt!: string;
}
