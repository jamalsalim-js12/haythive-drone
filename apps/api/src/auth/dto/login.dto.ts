import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({
    description: "Operator email address.",
    example: "operator@haythive.local",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: "Account password.",
    example: "demo",
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  password!: string;
}
