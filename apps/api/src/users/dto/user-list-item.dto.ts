import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class UserListItemDto {
  @ApiProperty({ example: "clx0123456789" })
  id!: string;

  @ApiProperty({ example: "operator@haythive.local" })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  role!: UserRole;

  @ApiProperty({ example: "2026-09-17T12:00:00.000Z" })
  createdAt!: string;
}
