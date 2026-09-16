import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CommandStatus, CommandType } from "@prisma/client";

export class CommandResponseDto {
  @ApiProperty({ example: "clxcmd001" })
  id!: string;

  @ApiProperty({ example: "clxdevice001" })
  deviceId!: string;

  @ApiProperty({
    enum: CommandType,
    example: CommandType.LID_OPEN,
  })
  type!: CommandType;

  @ApiProperty({
    enum: CommandStatus,
    example: CommandStatus.SENT,
  })
  status!: CommandStatus;

  @ApiPropertyOptional({
    description: "Operator user id that issued the command.",
    nullable: true,
  })
  actorId!: string | null;

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

  @ApiProperty({
    description: "ISO-8601 last update timestamp.",
    example: "2026-09-16T11:00:00.100Z",
  })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: "ISO-8601 completion timestamp when terminal.",
    nullable: true,
  })
  completedAt!: string | null;
}
