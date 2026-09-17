"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, UserPlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getGetUsersInvitesQueryKey,
  getGetUsersQueryKey,
  useDeleteUsersById,
  useDeleteUsersInvitesById,
  useGetUsers,
  useGetUsersInvites,
  usePatchUsersById,
  usePostUsersInvites,
} from "@/api/generated/endpoints/users/users";
import {
  CreateUserInviteDtoRole,
  UpdateUserDtoRole,
} from "@/api/generated/models";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import { getErrorMessage } from "@/lib/api-mappers";
import { formatTimestamp } from "@/lib/format";

const ROLE_OPTIONS = [
  CreateUserInviteDtoRole.ADMIN,
  CreateUserInviteDtoRole.OPERATOR,
  CreateUserInviteDtoRole.TECHNICIAN,
] as const;

function roleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "TECHNICIAN":
      return "Technician";
    default:
      return "Operator";
  }
}

export function UsersAdminView() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const usersQuery = useGetUsers();
  const invitesQuery = useGetUsersInvites();
  const inviteMutation = usePostUsersInvites();
  const revokeMutation = useDeleteUsersInvitesById();
  const patchMutation = usePatchUsersById();
  const deleteMutation = useDeleteUsersById();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CreateUserInviteDtoRole>(
    CreateUserInviteDtoRole.OPERATOR,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const users =
    usersQuery.data?.status === 200 ? (usersQuery.data.data ?? []) : [];
  const invites =
    invitesQuery.data?.status === 200 ? (invitesQuery.data.data ?? []) : [];

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function refreshLists() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetUsersInvitesQueryKey() }),
    ]);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-none">
      <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="mr-auto">
          <p className="text-sm font-medium text-foreground">Users</p>
          <p className="text-xs text-muted-foreground">
            Invite operators and manage roles. Share invite links manually —
            email delivery is not wired yet.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setInviteOpen(true);
            setFormError(null);
            setCreatedInviteUrl(null);
            setEmail("");
            setRole(CreateUserInviteDtoRole.OPERATOR);
          }}
        >
          <UserPlusIcon />
          Invite user
        </Button>
      </div>

      {actionError ? (
        <p className="px-4 pt-3 text-sm text-destructive sm:px-6" role="alert">
          {actionError}
        </p>
      ) : null}

      <div className="space-y-8 px-4 py-4 sm:px-6">
        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Active users</p>
            <p className="text-xs text-muted-foreground">
              {usersQuery.isLoading
                ? "Loading…"
                : `${users.length} account${users.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No users yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((row) => {
                    const isSelf = row.id === user?.id;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">
                          {row.email}
                          {isSelf ? (
                            <Badge variant="secondary" className="ml-2">
                              You
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={row.role}
                            disabled={isSelf || patchMutation.isPending}
                            onValueChange={(value) => {
                              if (typeof value !== "string") return;
                              setActionError(null);
                              patchMutation.mutate(
                                {
                                  id: row.id,
                                  data: {
                                    role: value as UpdateUserDtoRole,
                                  },
                                },
                                {
                                  onSuccess: () => {
                                    void refreshLists();
                                  },
                                  onError: (err) => {
                                    setActionError(
                                      getErrorMessage(err) ??
                                        "Could not update role.",
                                    );
                                  },
                                },
                              );
                            }}
                          >
                            <SelectTrigger size="sm" className="min-w-32">
                              <SelectValue>
                                {(value) =>
                                  roleLabel(String(value ?? row.role))
                                }
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {ROLE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option}
                                    value={option}
                                    label={roleLabel(option)}
                                  >
                                    {roleLabel(option)}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatTimestamp(row.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf || deleteMutation.isPending}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Remove ${row.email} from the platform?`,
                                )
                              ) {
                                return;
                              }
                              setActionError(null);
                              deleteMutation.mutate(
                                { id: row.id },
                                {
                                  onSuccess: () => {
                                    void refreshLists();
                                  },
                                  onError: (err) => {
                                    setActionError(
                                      getErrorMessage(err) ??
                                        "Could not delete user.",
                                    );
                                  },
                                },
                              );
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Pending invites
            </p>
            <p className="text-xs text-muted-foreground">
              {invitesQuery.isLoading
                ? "Loading…"
                : `${invites.length} outstanding`}
            </p>
          </div>
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Invited by</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No pending invites.
                    </TableCell>
                  </TableRow>
                ) : (
                  invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-mono text-xs">
                        {invite.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {roleLabel(invite.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatTimestamp(invite.expiresAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {invite.invitedByEmail}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={revokeMutation.isPending}
                          onClick={() => {
                            setActionError(null);
                            revokeMutation.mutate(
                              { id: invite.id },
                              {
                                onSuccess: () => {
                                  void refreshLists();
                                },
                                onError: (err) => {
                                  setActionError(
                                    getErrorMessage(err) ??
                                      "Could not revoke invite.",
                                  );
                                },
                              },
                            );
                          }}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setCreatedInviteUrl(null);
            setFormError(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdInviteUrl ? "Invite created" : "Invite user"}
            </DialogTitle>
            <DialogDescription>
              {createdInviteUrl
                ? "Copy this link and send it to the person. It expires in 7 days and can only be used once."
                : "They will set their own password when they open the invite link."}
            </DialogDescription>
          </DialogHeader>

          {createdInviteUrl ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="break-all font-mono text-xs leading-relaxed">
                  {createdInviteUrl}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(createdInviteUrl).then(
                    () => setCopied(true),
                    () => setFormError("Could not copy to clipboard."),
                  );
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy invite link"}
              </Button>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!email.trim()) {
                  setFormError("Enter an email address.");
                  return;
                }
                setFormError(null);
                inviteMutation.mutate(
                  { data: { email: email.trim(), role } },
                  {
                    onSuccess: (result) => {
                      if (result.status !== 201) {
                        setFormError("Invite failed.");
                        return;
                      }
                      setCreatedInviteUrl(result.data.inviteUrl);
                      void refreshLists();
                    },
                    onError: (err) => {
                      setFormError(
                        getErrorMessage(err) ?? "Could not create invite.",
                      );
                    },
                  },
                );
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) => {
                    if (typeof value === "string") {
                      setRole(value as CreateUserInviteDtoRole);
                    }
                  }}
                >
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue>
                      {(value) => roleLabel(String(value ?? role))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ROLE_OPTIONS.map((option) => (
                        <SelectItem
                          key={option}
                          value={option}
                          label={roleLabel(option)}
                        >
                          {roleLabel(option)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {formError ? (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Creating…" : "Create invite"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {createdInviteUrl ? (
            <DialogFooter>
              <Button type="button" onClick={() => setInviteOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
