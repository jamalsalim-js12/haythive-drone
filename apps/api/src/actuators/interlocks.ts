import {
  CommandType,
  Connectivity,
  LidState,
  OpState,
  PlatformState,
} from "@prisma/client";

type InterlockState = {
  connectivity: Connectivity;
  opState: OpState;
  lid: LidState;
  platform: PlatformState;
};

/**
 * Soft control-plane interlocks (edge remains hard safety).
 * Full matrix + unit tests land in KON-42; this blocks clearly unsafe MVP moves.
 */
export function interlockReason(
  state: InterlockState,
  type: CommandType,
): string | null {
  if (state.connectivity === Connectivity.OFFLINE) {
    return "Dock is offline";
  }
  if (state.opState === OpState.FAULT) {
    return "Dock is in fault — clear before commanding";
  }
  if (state.opState === OpState.MOVING) {
    return "Motion in progress — abort or wait";
  }
  if (type === CommandType.LID_CLOSE && state.platform !== PlatformState.DOWN) {
    return "Close lid only when platform is down";
  }
  if (type === CommandType.PLATFORM_RAISE && state.lid !== LidState.OPEN) {
    return "Raise platform only when lid is open";
  }
  if (type === CommandType.PLATFORM_LOWER && state.lid !== LidState.OPEN) {
    return "Lower platform only when lid is open";
  }
  if (type === CommandType.LID_OPEN && state.lid === LidState.OPEN) {
    return "Lid is already open";
  }
  if (type === CommandType.LID_CLOSE && state.lid === LidState.CLOSED) {
    return "Lid is already closed";
  }
  if (
    type === CommandType.PLATFORM_RAISE &&
    state.platform === PlatformState.UP
  ) {
    return "Platform is already up";
  }
  if (
    type === CommandType.PLATFORM_LOWER &&
    state.platform === PlatformState.DOWN
  ) {
    return "Platform is already down";
  }
  return null;
}
