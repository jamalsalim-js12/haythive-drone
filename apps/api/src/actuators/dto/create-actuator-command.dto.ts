import { ApiProperty } from "@nestjs/swagger";
import { CommandType } from "@prisma/client";
import { IsEnum, IsString, MinLength } from "class-validator";

/** MVP actuator command types for POST /actuators/commands. */
export const ActuatorCommandType = {
  LID_OPEN: CommandType.LID_OPEN,
  LID_CLOSE: CommandType.LID_CLOSE,
  PLATFORM_RAISE: CommandType.PLATFORM_RAISE,
  PLATFORM_LOWER: CommandType.PLATFORM_LOWER,
} as const;

export type ActuatorCommandType =
  (typeof ActuatorCommandType)[keyof typeof ActuatorCommandType];

export class CreateActuatorCommandDto {
  @ApiProperty({
    description: "Target dock device id.",
    example: "clxdevice001",
  })
  @IsString()
  @MinLength(1)
  deviceId!: string;

  @ApiProperty({
    description: "Actuator command to dispatch to the edge.",
    enum: ActuatorCommandType,
    example: CommandType.LID_OPEN,
  })
  @IsEnum(ActuatorCommandType)
  type!: ActuatorCommandType;
}
