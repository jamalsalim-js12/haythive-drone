"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getGetAuthMeQueryKey,
  useGetAuthInvitesByToken,
  usePostAuthAcceptInvite,
} from "@/api/generated/endpoints/auth/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { getErrorMessage } from "@/lib/api-mappers";

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

export function AcceptInviteForm() {
  const params = useParams<{ token: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const previewQuery = useGetAuthInvitesByToken(token, {
    query: {
      enabled: Boolean(token),
      retry: false,
    },
  });
  const acceptMutation = usePostAuthAcceptInvite();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  const preview =
    previewQuery.data?.status === 200 ? previewQuery.data.data : null;
  const previewFailed =
    previewQuery.isError ||
    (previewQuery.isSuccess && previewQuery.data.status !== 200);

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #cbd5e1 1px, transparent 1px), linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="lg" priority />
          <p className="mt-4 text-sm text-muted-foreground">
            Accept your invitation and choose a password.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          {previewQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading invite…</p>
          ) : previewFailed || !preview ? (
            <>
              <p className="text-sm text-destructive" role="alert">
                {getErrorMessage(previewQuery.error) ??
                  "This invite is invalid, expired, or already used."}
              </p>
              <Button
                nativeButton={false}
                render={<Link href="/login" />}
                variant="outline"
              >
                Back to sign in
              </Button>
            </>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (password.length < 8) {
                  setError("Password must be at least 8 characters.");
                  return;
                }
                if (password !== confirm) {
                  setError("Passwords do not match.");
                  return;
                }
                setError(null);
                acceptMutation.mutate(
                  { data: { token, password } },
                  {
                    onSuccess: async (result) => {
                      if (result.status !== 200) {
                        setError("Could not accept invite.");
                        return;
                      }
                      queryClient.setQueryData(getGetAuthMeQueryKey(), {
                        data: result.data,
                        status: 200,
                        headers: result.headers,
                      });
                      await queryClient.invalidateQueries({
                        queryKey: getGetAuthMeQueryKey(),
                      });
                      router.replace("/");
                    },
                    onError: (err) => {
                      setError(
                        getErrorMessage(err) ?? "Could not accept invite.",
                      );
                    },
                  },
                );
              }}
            >
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <p className="font-mono text-xs text-foreground">
                  {preview.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Role: {roleLabel(preview.role)}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending
                  ? "Creating account…"
                  : "Accept invite"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
