import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ChargeStatus,
  LidState,
  OpState,
  PlatformState,
  Readiness,
} from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { ReadinessReasonDto } from "../../common/dto/readiness-reason.dto";

export class DeviceIngestDto {
  @ApiProperty({
    description: "Dock serial number.",
    example: "HH-DOCK-001",
  })
  @IsString()
  @MinLength(1)
  serial!: string;

  @ApiPropertyOptional({ enum: OpState })
  @IsOptional()
  @IsEnum(OpState)
  opState?: OpState;

  @ApiPropertyOptional({ enum: LidState })
  @IsOptional()
  @IsEnum(LidState)
  lid?: LidState;

  @ApiPropertyOptional({ enum: PlatformState })
  @IsOptional()
  @IsEnum(PlatformState)
  platform?: PlatformState;

  @ApiPropertyOptional({ enum: ChargeStatus })
  @IsOptional()
  @IsEnum(ChargeStatus)
  chargeStatus?: ChargeStatus;

  @ApiPropertyOptional({ example: 86, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  socPercent?: number;

  @ApiPropertyOptional({ enum: Readiness })
  @IsOptional()
  @IsEnum(Readiness)
  readiness?: Readiness;

  @ApiPropertyOptional({ type: ReadinessReasonDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadinessReasonDto)
  readinessReasons?: ReadinessReasonDto[];

  @ApiPropertyOptional({
    description: "Opaque edge extras (faults, override flags, etc.).",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  extras?: Record<string, unknown>;
}
