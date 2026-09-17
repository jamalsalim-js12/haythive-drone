import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CommandStatus, CommandType } from "@prisma/client";

export class DeviceCommandResponseDto {
  @ApiProperty({ example: "seed-cmd-001" })
  id!: string;

  @ApiProperty({ example: "clxdevice001" })
  deviceId!: string;

  @ApiProperty({ enum: CommandType, example: CommandType.LID_OPEN })
  type!: CommandType;

  @ApiProperty({ enum: CommandStatus, example: CommandStatus.ACKED })
  status!: CommandStatus;

  @ApiPropertyOptional({
    description: "Operator email when known.",
    nullable: true,
    example: "admin@ioteedom.com",
  })
  actorEmail!: string | null;

  @ApiPropertyOptional({
    description: "Human-readable status or error detail.",
    nullable: true,
  })
  message!: string | null;

  @ApiProperty({
    description: "ISO-8601 creation timestamp.",
    example: "2026-09-16T11:00:00.000Z",
  })
  createdAt!: string;

  @ApiPropertyOptional({
    description: "ISO-8601 completion timestamp when terminal.",
    nullable: true,
  })
  completedAt!: string | null;
}
