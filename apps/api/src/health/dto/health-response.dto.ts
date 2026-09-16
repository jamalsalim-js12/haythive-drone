import { ApiProperty } from "@nestjs/swagger";

export class DeviceConnectivitySummaryDto {
  @ApiProperty({ example: 1 })
  online!: number;

  @ApiProperty({ example: 0 })
  degraded!: number;

  @ApiProperty({ example: 0 })
  offline!: number;
}

export class HealthResponseDto {
  @ApiProperty({
    description: "Overall API health status.",
    enum: ["ok", "degraded"],
    example: "ok",
  })
  status!: "ok" | "degraded";

  @ApiProperty({
    description: "Database connectivity status.",
    enum: ["up", "down"],
    example: "up",
  })
  database!: "up" | "down";

  @ApiProperty({
    description: "Dock connectivity counts after stale-heartbeat projection.",
    type: DeviceConnectivitySummaryDto,
  })
  devices!: DeviceConnectivitySummaryDto;

  @ApiProperty({
    description: "ISO-8601 timestamp when the check ran.",
    example: "2026-09-16T09:00:00.000Z",
  })
  timestamp!: string;
}
