import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ActuatorsService } from "./actuators.service";
import { AbortActuatorCommandDto } from "./dto/abort-actuator-command.dto";
import { CommandResponseDto } from "./dto/command-response.dto";
import { CreateActuatorCommandDto } from "./dto/create-actuator-command.dto";

@ApiTags("Actuators")
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller("actuators")
export class ActuatorsController {
  constructor(private readonly actuatorsService: ActuatorsService) {}

  @Post("commands")
  @ApiOperation({
    operationId: "postActuatorsCommands",
    summary: "Dispatch a dock actuator command",
    description:
      "Persists a lid or platform command, validates soft interlocks, marks it SENT, and dispatches it to the edge adapter. The stub edge later ACKs and updates projected dock state.",
  })
  @ApiCreatedResponse({ type: CommandResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  @ApiNotFoundResponse({ description: "Device not found." })
  @ApiConflictResponse({
    description: "Interlock rejected the command or device has no state.",
  })
  postActuatorsCommands(
    @Body() body: CreateActuatorCommandDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CommandResponseDto> {
    return this.actuatorsService.createCommand(body, user);
  }

  @Post("commands/:id/abort")
  @ApiOperation({
    operationId: "postActuatorsCommandsByIdAbort",
    summary: "Abort an in-progress actuator command",
    description:
      "Stops an active (PENDING/SENT) lid or platform command, notifies the edge adapter, marks the original command FAILED, records an ACKED ABORT command, and sets moving axes to UNKNOWN.",
  })
  @ApiOkResponse({ type: CommandResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  @ApiNotFoundResponse({ description: "Command not found." })
  @ApiConflictResponse({
    description: "Command is not active or dock is not moving.",
  })
  postActuatorsCommandsByIdAbort(
    @Param("id") id: string,
    @Body() body: AbortActuatorCommandDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CommandResponseDto> {
    return this.actuatorsService.abortCommand(id, body, user);
  }
}
