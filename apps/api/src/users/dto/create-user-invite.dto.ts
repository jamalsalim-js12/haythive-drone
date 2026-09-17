import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsEmail, IsEnum } from "class-validator";

export class CreateUserInviteDto {
  @ApiProperty({
    description: "Email address to invite.",
    example: "operator@example.com",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: "Role granted when the invite is accepted.",
    enum: UserRole,
    example: UserRole.OPERATOR,
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
