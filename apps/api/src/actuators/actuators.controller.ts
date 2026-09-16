import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { ActuatorsService } from "./actuators.service";
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
}
