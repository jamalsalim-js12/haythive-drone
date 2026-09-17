import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AcceptInviteDto {
  @ApiProperty({
    description: "Invite token from the invitation link.",
    example: "a1b2c3d4e5f6...",
  })
  @IsString()
  @MinLength(16)
  token!: string;

  @ApiProperty({
    description: "Password the invitee will use to sign in.",
    example: "secure-password",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;
}
