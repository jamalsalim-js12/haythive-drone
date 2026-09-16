import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import type { AuthenticatedUser } from "./types/authenticated-user";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "postAuthLogin",
    summary: "Sign in with email and password",
    description:
      "Validates operator credentials and sets an httpOnly session cookie used by subsequent API calls.",
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: "Invalid email or password." })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, accessToken } = await this.authService.login(dto);
    this.authService.setSessionCookie(res, accessToken);
    return user;
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "postAuthLogout",
    summary: "Sign out",
    description:
      "Clears the session cookie so the browser is no longer authenticated.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { ok: { type: "boolean", example: true } },
    },
  })
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    this.authService.clearSessionCookie(res);
    return { ok: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    operationId: "getAuthMe",
    summary: "Get current user",
    description: "Returns the authenticated operator from the session cookie.",
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  me(@CurrentUser() user: AuthenticatedUser): UserResponseDto {
    return this.authService.toUserResponse(user);
  }
}
