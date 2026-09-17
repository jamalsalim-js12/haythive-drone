import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { User, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";
import type { Response } from "express";
import { hashInviteToken } from "../common/invite-token";
import { PrismaService } from "../prisma/prisma.service";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { InvitePreviewDto } from "./dto/invite-preview.dto";
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

  async previewInvite(token: string): Promise<InvitePreviewDto> {
    const invite = await this.findValidInvite(token);
    return {
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  async acceptInvite(
    dto: AcceptInviteDto,
  ): Promise<{ user: UserResponseDto; accessToken: string }> {
    const invite = await this.findValidInvite(dto.token);

    const existing = await this.prisma.user.findUnique({
      where: { email: invite.email },
    });
    if (existing) {
      throw new ConflictException("A user with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: invite.email,
        passwordHash,
        role: invite.role,
      },
    });

    await this.prisma.userInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    const accessToken = await this.signToken(user);
    return { user: this.toUserResponse(user), accessToken };
  }

  private async findValidInvite(token: string): Promise<{
    id: string;
    email: string;
    role: UserRole;
    expiresAt: Date;
  }> {
    if (!token.trim()) {
      throw new BadRequestException("Invite token is required.");
    }

    const invite = await this.prisma.userInvite.findUnique({
      where: { tokenHash: hashInviteToken(token) },
    });

    if (!invite || invite.acceptedAt) {
      throw new NotFoundException("Invite not found or already used.");
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("This invite has expired.");
    }

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    };
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
      ...this.sessionCookieOptions(),
      maxAge: maxAgeMs,
    });
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE, this.sessionCookieOptions());
  }

  /**
   * Cross-origin web (e.g. app.example.com → api.example.com) needs
   * SameSite=None; Secure so credentialed fetches include the session cookie.
   * Local same-site (localhost:3000 → :3001) can keep Lax.
   */
  private sessionCookieOptions(): {
    httpOnly: true;
    sameSite: "lax" | "none" | "strict";
    secure: boolean;
    path: string;
  } {
    const isProd = this.config.get<string>("NODE_ENV") === "production";
    const configured = this.config.get<string>("COOKIE_SAME_SITE")?.toLowerCase();
    const sameSite =
      configured === "none" || configured === "lax" || configured === "strict"
        ? configured
        : isProd
          ? "none"
          : "lax";
    const secure =
      sameSite === "none" ||
      this.config.get<string>("COOKIE_SECURE") === "true" ||
      isProd;

    return {
      httpOnly: true,
      sameSite,
      secure,
      path: "/",
    };
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
