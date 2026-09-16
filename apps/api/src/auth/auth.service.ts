import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import type { AuthenticatedUser } from "./types/authenticated-user";
import type { JwtPayload } from "./types/jwt-payload";

export const SESSION_COOKIE = "haythive_session";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ user: UserResponseDto; accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const accessToken = await this.signToken(user);
    return { user: this.toUserResponse(user), accessToken };
  }

  async validatePayload(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid session.");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  toUserResponse(user: Pick<User, "id" | "email" | "role">): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  setSessionCookie(res: Response, accessToken: string): void {
    const maxAgeMs = this.sessionTtlSeconds() * 1000;
    res.cookie(SESSION_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.get<string>("NODE_ENV") === "production",
      path: "/",
      maxAge: maxAgeMs,
    });
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: "lax",
      secure: this.config.get<string>("NODE_ENV") === "production",
      path: "/",
    });
  }

  private async signToken(user: {
    id: string;
    email: string;
    role: UserRole;
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.jwtSecret(),
      expiresIn: this.sessionTtlSeconds(),
    });
  }

  jwtSecret(): string {
    return (
      this.config.get<string>("JWT_SECRET") ??
      "dev-only-change-me-haythive-dock"
    );
  }

  sessionTtlSeconds(): number {
    const raw = this.config.get<string>("SESSION_TTL_SECONDS");
    const parsed = raw ? Number(raw) : Number.NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60 * 60 * 24 * 7;
  }
}
