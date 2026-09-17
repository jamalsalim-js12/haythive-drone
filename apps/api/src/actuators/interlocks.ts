import {
  CommandType,
  Connectivity,
  LidState,
  OpState,
  PlatformState,
} from "@prisma/client";

export type InterlockState = {
  connectivity: Connectivity;
  opState: OpState;
  lid: LidState;
  platform: PlatformState;
};

/** Stable reason strings returned with HTTP 409 Conflict. */
export const InterlockReason = {
  OFFLINE: "Dock is offline",
  FAULT: "Dock is in fault — clear before commanding",
  SERVICE: "Dock is in service mode — commands are disabled",
  MOVING: "Motion in progress — abort or wait",
  LID_CLOSE_PLATFORM: "Close lid only when platform is down",
  PLATFORM_RAISE_LID: "Raise platform only when lid is open",
  PLATFORM_LOWER_LID: "Lower platform only when lid is open",
  LID_ALREADY_OPEN: "Lid is already open",
  LID_ALREADY_CLOSED: "Lid is already closed",
  PLATFORM_ALREADY_UP: "Platform is already up",
  PLATFORM_ALREADY_DOWN: "Platform is already down",
} as const;

/**
 * Soft control-plane interlocks for lid/platform moves (edge remains hard safety).
 *
 * Draft matrix (CAD may refine later):
 * - Reject if OFFLINE, FAULT, or SERVICE
 * - Reject if dock or either axis is already MOVING
 * - Close lid only when platform is DOWN
 * - Raise/lower platform only when lid is OPEN
 * - Reject no-op commands (already at target)
 *
 * DEGRADED connectivity is allowed (soft warning only).
 */
export function interlockReason(
  state: InterlockState,
  type: CommandType,
): string | null {
  if (state.connectivity === Connectivity.OFFLINE) {
    return InterlockReason.OFFLINE;
  }
  if (state.opState === OpState.FAULT) {
    return InterlockReason.FAULT;
  }
  if (state.opState === OpState.SERVICE) {
    return InterlockReason.SERVICE;
  }
  if (
    state.opState === OpState.MOVING ||
    state.lid === LidState.MOVING ||
    state.platform === PlatformState.MOVING
  ) {
    return InterlockReason.MOVING;
  }

  if (type === CommandType.ABORT) {
    // Abort is handled by POST /actuators/commands/:id/abort, not createCommand.
    return null;
  }

  if (type === CommandType.LID_CLOSE && state.platform !== PlatformState.DOWN) {
    return InterlockReason.LID_CLOSE_PLATFORM;
  }
  if (type === CommandType.PLATFORM_RAISE && state.lid !== LidState.OPEN) {
    return InterlockReason.PLATFORM_RAISE_LID;
  }
  if (type === CommandType.PLATFORM_LOWER && state.lid !== LidState.OPEN) {
    return InterlockReason.PLATFORM_LOWER_LID;
  }
  if (type === CommandType.LID_OPEN && state.lid === LidState.OPEN) {
    return InterlockReason.LID_ALREADY_OPEN;
  }
  if (type === CommandType.LID_CLOSE && state.lid === LidState.CLOSED) {
    return InterlockReason.LID_ALREADY_CLOSED;
  }
  if (
    type === CommandType.PLATFORM_RAISE &&
    state.platform === PlatformState.UP
  ) {
    return InterlockReason.PLATFORM_ALREADY_UP;
  }
  if (
    type === CommandType.PLATFORM_LOWER &&
    state.platform === PlatformState.DOWN
  ) {
    return InterlockReason.PLATFORM_ALREADY_DOWN;
  }
  return null;
}
