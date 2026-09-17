"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getGetAuthMeQueryKey,
  usePostAuthLogin,
} from "@/api/generated/endpoints/auth/auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { getErrorMessage } from "@/lib/api-mappers";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useSession();
  const loginMutation = usePostAuthLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

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
            Sign in to operate the dock control plane.
          </p>
        </div>

        <form
          className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim() || !password.trim()) {
              setError("Enter email and password.");
              return;
            }
            setError(null);
            loginMutation.mutate(
              { data: { email: email.trim(), password } },
              {
                onSuccess: async (result) => {
                  if (result.status !== 200) {
                    setError("Sign in failed.");
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
                    getErrorMessage(err) ?? "Invalid email or password.",
                  );
                },
              },
            );
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
