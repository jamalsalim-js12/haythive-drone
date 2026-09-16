"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAuthMeQueryKey,
  useGetAuthMe,
  usePostAuthLogout,
} from "@/api/generated/endpoints/auth/auth";
import type { UserResponseDto } from "@/api/generated/models";

export type SessionUser = Pick<UserResponseDto, "id" | "email" | "role">;

export function useSession() {
  const queryClient = useQueryClient();
  const meQuery = useGetAuthMe({
    query: {
      retry: false,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  });
  const logoutMutation = usePostAuthLogout();

  const user =
    meQuery.isSuccess && meQuery.data.status === 200 ? meQuery.data.data : null;

  return {
    user,
    session: user
      ? { email: user.email, signedInAt: new Date().toISOString() }
      : null,
    isAuthenticated: Boolean(user),
    isLoading: meQuery.isLoading || meQuery.isFetching,
    error: meQuery.error,
    refetch: meQuery.refetch,
    signOut: async () => {
      try {
        await logoutMutation.mutateAsync();
      } catch {
        // Clear local session view even if logout request fails.
      }
      queryClient.setQueryData(getGetAuthMeQueryKey(), undefined);
      await queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
    },
  };
}
