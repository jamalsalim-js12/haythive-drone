"use client";

import { useSyncExternalStore } from "react";
import {
  clearSession,
  getSession,
  type Session,
  subscribeSession,
} from "@/lib/auth";

const SERVER_SESSION: Session | null = null;

export function useSession() {
  const session = useSyncExternalStore(
    subscribeSession,
    getSession,
    () => SERVER_SESSION,
  );

  return {
    session,
    isAuthenticated: Boolean(session),
    signOut: clearSession,
  };
}
