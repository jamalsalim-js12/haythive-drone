import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthResponseDto } from "./dto/health-response.dto";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    operationId: "getHealth",
    summary: "Get API health",
    description:
      "Returns process health and whether the database connection is reachable.",
  })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): Promise<HealthResponseDto> {
    return this.healthService.check();
  }
}
