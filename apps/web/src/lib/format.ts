import { formatDistanceToNowStrict, parseISO } from "date-fns";
import type { CommandStatus, CommandType } from "@/lib/types";

export function formatHeartbeatAge(iso: string) {
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: false });
  } catch {
    return "—";
  }
}

export function formatTimestamp(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(parseISO(iso));
  } catch {
    return iso;
  }
}

export function commandLabel(type: CommandType) {
  switch (type) {
    case "LID_OPEN":
      return "Open lid";
    case "LID_CLOSE":
      return "Close lid";
    case "PLATFORM_RAISE":
      return "Raise platform";
    case "PLATFORM_LOWER":
      return "Lower platform";
    case "ABORT":
      return "Abort";
  }
}

export function statusTone(status: CommandStatus) {
  switch (status) {
    case "ACKED":
      return "signal" as const;
    case "FAILED":
    case "TIMEOUT":
      return "destructive" as const;
    case "PENDING":
    case "SENT":
      return "caution" as const;
  }
}

export const PAGE_SIZE = 10;
