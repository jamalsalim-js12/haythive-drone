import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AuditEntityType } from "@prisma/client";

export class DeviceAuditEventResponseDto {
  @ApiProperty({ example: "seed-aud-001" })
  id!: string;

  @ApiPropertyOptional({
    description: "Related dock device id.",
    nullable: true,
  })
  deviceId!: string | null;

  @ApiProperty({ example: "command.lid_open" })
  action!: string;

  @ApiProperty({ enum: AuditEntityType, example: AuditEntityType.COMMAND })
  entityType!: AuditEntityType;

  @ApiProperty({ example: "seed-cmd-001" })
  entityId!: string;

  @ApiPropertyOptional({
    description: "Operator email when known.",
    nullable: true,
    type: String,
    example: "admin@ioteedom.com",
  })
  actorEmail!: string | null;

  @ApiPropertyOptional({
    description: "Optional structured metadata.",
    nullable: true,
    type: "object",
    additionalProperties: true,
  })
  meta!: Record<string, unknown> | null;

  @ApiProperty({
    description: "ISO-8601 creation timestamp.",
    example: "2026-09-16T11:00:00.000Z",
  })
  createdAt!: string;
}
