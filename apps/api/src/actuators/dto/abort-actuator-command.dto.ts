import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class AbortActuatorCommandDto {
  @ApiPropertyOptional({
    description: "Optional human-readable reason for the abort.",
    example: "Operator halted motion",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
