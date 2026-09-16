import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class UserResponseDto {
  @ApiProperty({ example: "clx0123456789" })
  id!: string;

  @ApiProperty({ example: "operator@haythive.local" })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OPERATOR })
  role!: UserRole;
}
