import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { DeviceIngestService } from "./device-ingest.service";
import { DeviceIngestDto } from "./dto/device-ingest.dto";
import { DeviceIngestResponseDto } from "./dto/device-ingest-response.dto";

@ApiTags("Device Ingest")
@Controller("device")
export class DeviceIngestController {
  constructor(private readonly ingestService: DeviceIngestService) {}

  @Post("ingest")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "postDeviceIngest",
    summary: "Ingest dock heartbeat and state",
    description:
      "Edge/simulator endpoint. Authenticates with device serial + ingest token, updates lastHeartbeatAt and projected dock state, and marks the dock ONLINE.",
  })
  @ApiHeader({
    name: "X-Device-Token",
    description: "Device ingest token issued at provisioning/seed time.",
    required: true,
  })
  @ApiOkResponse({ type: DeviceIngestResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid serial or ingest token." })
  async postDeviceIngest(
    @Body() dto: DeviceIngestDto,
    @Headers("x-device-token") deviceToken?: string,
    @Headers("authorization") authorization?: string,
  ): Promise<DeviceIngestResponseDto> {
    const token = this.extractToken(deviceToken, authorization);
    if (!token) {
      throw new UnauthorizedException("Missing device ingest token.");
    }
    return this.ingestService.ingest(dto, token);
  }

  private extractToken(
    deviceToken?: string,
    authorization?: string,
  ): string | null {
    if (deviceToken && deviceToken.trim().length > 0) {
      return deviceToken.trim();
    }
    if (authorization?.toLowerCase().startsWith("bearer ")) {
      const bearer = authorization.slice(7).trim();
      return bearer.length > 0 ? bearer : null;
    }
    return null;
  }
}
