import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class UserInviteResponseDto {
  @ApiProperty({ example: "clxinvite0123" })
  id!: string;

  @ApiProperty({ example: "operator@example.com" })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  role!: UserRole;

  @ApiProperty({ example: "2026-09-24T12:00:00.000Z" })
  expiresAt!: string;

  @ApiProperty({ example: "2026-09-17T12:00:00.000Z" })
  createdAt!: string;

  @ApiPropertyOptional({
    description: "Set when the invite has been accepted.",
    example: null,
    nullable: true,
  })
  acceptedAt!: string | null;

  @ApiProperty({ example: "admin@ioteedom.com" })
  invitedByEmail!: string;
}

export class CreateUserInviteResponseDto extends UserInviteResponseDto {
  @ApiProperty({
    description:
      "One-time invite token. Shown only when the invite is created; share via the invite URL.",
    example: "a1b2c3d4e5f6...",
  })
  token!: string;

  @ApiProperty({
    description: "Absolute invite URL for the invitee.",
    example: "http://localhost:3000/invite/a1b2c3d4e5f6...",
  })
  inviteUrl!: string;
}
