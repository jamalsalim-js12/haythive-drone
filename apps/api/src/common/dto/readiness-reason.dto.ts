import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class ReadinessReasonDto {
  @ApiProperty({ example: "charge" })
  @IsString()
  @MinLength(1)
  id!: string;

  @ApiProperty({ example: "Battery charging healthy" })
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  pass!: boolean;

  @ApiPropertyOptional({ example: "SOC 86%" })
  @IsOptional()
  @IsString()
  detail?: string;
}
