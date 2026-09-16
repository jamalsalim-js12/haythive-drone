import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class DeviceResponseDto {
  @ApiProperty({ example: "clxdevice001" })
  id!: string;

  @ApiProperty({ example: "Lab Dock 1" })
  name!: string;

  @ApiProperty({ example: "HH-DOCK-001" })
  serial!: string;

  @ApiPropertyOptional({
    description: "Site display name when the dock is assigned to a site.",
    example: "IoTeedom Lab",
    nullable: true,
  })
  siteName!: string | null;

  @ApiPropertyOptional({
    description: "ISO-8601 timestamp of the last edge heartbeat.",
    example: "2026-09-16T10:00:00.000Z",
    nullable: true,
  })
  lastHeartbeatAt!: string | null;
}
