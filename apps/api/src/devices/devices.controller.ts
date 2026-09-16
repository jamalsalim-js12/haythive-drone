import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DevicesService } from "./devices.service";
import { DeviceResponseDto } from "./dto/device-response.dto";
import { DeviceStateResponseDto } from "./dto/device-state-response.dto";

@ApiTags("Devices")
@ApiCookieAuth()
@UseGuards(JwtAuthGuard)
@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  @ApiOperation({
    operationId: "getDevices",
    summary: "List dock devices",
    description:
      "Returns registered dock devices for the operator dashboard, including site name and last heartbeat.",
  })
  @ApiOkResponse({ type: DeviceResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  getDevices(): Promise<DeviceResponseDto[]> {
    return this.devicesService.findAll();
  }

  @Get(":id/state")
  @ApiOperation({
    operationId: "getDevicesByIdState",
    summary: "Get current dock state",
    description:
      "Returns the latest projected dock state: lid, platform, charge, readiness, connectivity, and heartbeat age inputs.",
  })
  @ApiOkResponse({ type: DeviceStateResponseDto })
  @ApiNotFoundResponse({ description: "Device or device state not found." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  async getDevicesByIdState(
    @Param("id") id: string,
  ): Promise<DeviceStateResponseDto> {
    const state = await this.devicesService.findStateByDeviceId(id);
    if (!state) {
      throw new NotFoundException(`State for device ${id} not found.`);
    }
    return state;
  }

  @Get(":id")
  @ApiOperation({
    operationId: "getDevicesById",
    summary: "Get a dock device",
    description: "Returns a single dock device by id.",
  })
  @ApiOkResponse({ type: DeviceResponseDto })
  @ApiNotFoundResponse({ description: "Device not found." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  async getDevicesById(@Param("id") id: string): Promise<DeviceResponseDto> {
    const device = await this.devicesService.findById(id);
    if (!device) {
      throw new NotFoundException(`Device ${id} not found.`);
    }
    return device;
  }
}
