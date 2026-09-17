import { randomBytes } from "node:crypto";
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { UserInvite } from "@prisma/client";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { hashInviteToken } from "../common/invite-token";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserInviteDto } from "./dto/create-user-invite.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import {
  CreateUserInviteResponseDto,
  UserInviteResponseDto,
} from "./dto/user-invite-response.dto";
import { UserListItemDto } from "./dto/user-list-item.dto";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listUsers(): Promise<UserListItemDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: [{ role: "asc" }, { email: "asc" }],
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async updateUser(
    id: string,
    dto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserListItemDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found.`);
    }

    if (user.id === actor.id && dto.role !== user.role) {
      throw new ForbiddenException("You cannot change your own role.");
    }

    if (user.role === "ADMIN" && dto.role !== "ADMIN") {
      await this.assertAnotherAdminExists(user.id);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteUser(id: string, actor: AuthenticatedUser): Promise<void> {
    if (id === actor.id) {
      throw new ForbiddenException("You cannot delete your own account.");
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found.`);
    }

    if (user.role === "ADMIN") {
      await this.assertAnotherAdminExists(user.id);
    }

    await this.prisma.user.delete({ where: { id } });
  }

  async listInvites(): Promise<UserInviteResponseDto[]> {
    const invites = await this.prisma.userInvite.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        invitedBy: { select: { email: true } },
      },
    });

    return invites.map((invite) => this.toInviteResponse(invite));
  }

  async createInvite(
    dto: CreateUserInviteDto,
    actor: AuthenticatedUser,
  ): Promise<CreateUserInviteResponseDto> {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException("A user with this email already exists.");
    }

    await this.prisma.userInvite.deleteMany({
      where: {
        email,
        acceptedAt: null,
      },
    });

    const token = randomBytes(32).toString("base64url");
    const invite = await this.prisma.userInvite.create({
      data: {
        email,
        role: dto.role,
        tokenHash: hashInviteToken(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        invitedById: actor.id,
      },
      include: {
        invitedBy: { select: { email: true } },
      },
    });

    return {
      ...this.toInviteResponse(invite),
      token,
      inviteUrl: this.buildInviteUrl(token),
    };
  }

  async revokeInvite(id: string): Promise<void> {
    const invite = await this.prisma.userInvite.findUnique({ where: { id } });
    if (!invite || invite.acceptedAt) {
      throw new NotFoundException(`Invite ${id} not found.`);
    }

    await this.prisma.userInvite.delete({ where: { id } });
  }

  private async assertAnotherAdminExists(
    excludingUserId: string,
  ): Promise<void> {
    const otherAdmins = await this.prisma.user.count({
      where: {
        role: "ADMIN",
        id: { not: excludingUserId },
      },
    });

    if (otherAdmins === 0) {
      throw new ForbiddenException("At least one admin must remain.");
    }
  }

  private buildInviteUrl(token: string): string {
    const origin =
      this.config.get<string>("WEB_APP_ORIGIN") ??
      this.config.get<string>("CORS_ORIGIN") ??
      "http://localhost:3000";
    return `${origin.replace(/\/$/, "")}/invite/${token}`;
  }

  private toInviteResponse(
    invite: UserInvite & { invitedBy: { email: string } },
  ): UserInviteResponseDto {
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      invitedByEmail: invite.invitedBy.email,
    };
  }
}
