import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService, SESSION_COOKIE } from "../auth.service";
import type { JwtPayload } from "../types/jwt-payload";

function cookieExtractor(req: Request): string | null {
  const value = req?.cookies?.[SESSION_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>("JWT_SECRET") ?? "dev-only-change-me-haythive-dock",
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException("Invalid session.");
    }
    return this.authService.validatePayload(payload);
  }
}
