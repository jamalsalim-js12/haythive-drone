import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import type { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateUserInviteDto } from "./dto/create-user-invite.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import {
  CreateUserInviteResponseDto,
  UserInviteResponseDto,
} from "./dto/user-invite-response.dto";
import { UserListItemDto } from "./dto/user-list-item.dto";
import { UsersService } from "./users.service";

@ApiTags("Users")
@ApiCookieAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    operationId: "getUsers",
    summary: "List users",
    description: "Returns all platform users. Admin only.",
  })
  @ApiOkResponse({ type: UserListItemDto, isArray: true })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  @ApiForbiddenResponse({ description: "Admin access required." })
  getUsers(): Promise<UserListItemDto[]> {
    return this.usersService.listUsers();
  }

  @Get("invites")
  @ApiOperation({
    operationId: "getUsersInvites",
    summary: "List pending invites",
    description: "Returns outstanding (unaccepted) invites. Admin only.",
  })
  @ApiOkResponse({ type: UserInviteResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  @ApiForbiddenResponse({ description: "Admin access required." })
  getUsersInvites(): Promise<UserInviteResponseDto[]> {
    return this.usersService.listInvites();
  }

  @Post("invites")
  @ApiOperation({
    operationId: "postUsersInvites",
    summary: "Invite a user",
    description:
      "Creates a one-time invite link for an email and role. The raw token is returned only once so the admin can share it.",
  })
  @ApiCreatedResponse({ type: CreateUserInviteResponseDto })
  @ApiConflictResponse({ description: "User with this email already exists." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  @ApiForbiddenResponse({ description: "Admin access required." })
  postUsersInvites(
    @Body() dto: CreateUserInviteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CreateUserInviteResponseDto> {
    return this.usersService.createInvite(dto, actor);
  }

  @Delete("invites/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "deleteUsersInvitesById",
    summary: "Revoke an invite",
    description: "Deletes a pending invite so the link can no longer be used.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { ok: { type: "boolean", example: true } },
    },
  })
  @ApiNotFoundResponse({ description: "Invite not found." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  @ApiForbiddenResponse({ description: "Admin access required." })
  async deleteUsersInvitesById(@Param("id") id: string): Promise<{ ok: true }> {
    await this.usersService.revokeInvite(id);
    return { ok: true };
  }

  @Patch(":id")
  @ApiOperation({
    operationId: "patchUsersById",
    summary: "Update a user role",
    description:
      "Changes a user's role. Admins cannot demote or remove the last admin, or change their own role.",
  })
  @ApiOkResponse({ type: UserListItemDto })
  @ApiNotFoundResponse({ description: "User not found." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  @ApiForbiddenResponse({
    description: "Admin access required or action denied.",
  })
  patchUsersById(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserListItemDto> {
    return this.usersService.updateUser(id, dto, actor);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    operationId: "deleteUsersById",
    summary: "Delete a user",
    description:
      "Removes a user account. Cannot delete yourself or the last admin.",
  })
  @ApiOkResponse({
    schema: {
      type: "object",
      properties: { ok: { type: "boolean", example: true } },
    },
  })
  @ApiNotFoundResponse({ description: "User not found." })
  @ApiUnauthorizedResponse({ description: "Missing or invalid session." })
  @ApiForbiddenResponse({
    description: "Admin access required or action denied.",
  })
  async deleteUsersById(
    @Param("id") id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ ok: true }> {
    await this.usersService.deleteUser(id, actor);
    return { ok: true };
  }
}
