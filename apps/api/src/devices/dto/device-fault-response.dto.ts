import { ApiProperty } from "@nestjs/swagger";
import { FaultSeverity } from "@prisma/client";

export class DeviceFaultResponseDto {
  @ApiProperty({ example: "seed-flt-001" })
  id!: string;

  @ApiProperty({ example: "clxdevice001" })
  deviceId!: string;

  @ApiProperty({ example: "HB_STALE" })
  code!: string;

  @ApiProperty({
    enum: FaultSeverity,
    example: FaultSeverity.WARNING,
  })
  severity!: FaultSeverity;

  @ApiProperty({ example: "Heartbeat age exceeded 30s threshold" })
  message!: string;

  @ApiProperty({ example: false })
  resolved!: boolean;

  @ApiProperty({
    description: "ISO-8601 creation timestamp.",
    example: "2026-09-16T11:00:00.000Z",
  })
  createdAt!: string;
}
