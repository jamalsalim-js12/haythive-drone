import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class InvitePreviewDto {
  @ApiProperty({ example: "operator@example.com" })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  role!: UserRole;

  @ApiProperty({ example: "2026-09-24T12:00:00.000Z" })
  expiresAt!: string;
}
