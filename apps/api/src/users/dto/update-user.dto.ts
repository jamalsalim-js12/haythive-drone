import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateUserDto {
  @ApiProperty({
    description: "Updated platform role.",
    enum: UserRole,
    example: UserRole.TECHNICIAN,
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
