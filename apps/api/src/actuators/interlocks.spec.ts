import {
  CommandType,
  Connectivity,
  LidState,
  OpState,
  PlatformState,
} from "@prisma/client";
import {
  InterlockReason,
  type InterlockState,
  interlockReason,
} from "./interlocks";

function baseState(overrides: Partial<InterlockState> = {}): InterlockState {
  return {
    connectivity: Connectivity.ONLINE,
    opState: OpState.IDLE,
    lid: LidState.CLOSED,
    platform: PlatformState.DOWN,
    ...overrides,
  };
}

describe("interlockReason", () => {
  describe("connectivity and opState gates", () => {
    it("rejects when offline", () => {
      expect(
        interlockReason(
          baseState({ connectivity: Connectivity.OFFLINE }),
          CommandType.LID_OPEN,
        ),
      ).toBe(InterlockReason.OFFLINE);
    });

    it("allows degraded connectivity", () => {
      expect(
        interlockReason(
          baseState({ connectivity: Connectivity.DEGRADED }),
          CommandType.LID_OPEN,
        ),
      ).toBeNull();
    });

    it("rejects when faulted", () => {
      expect(
        interlockReason(
          baseState({ opState: OpState.FAULT }),
          CommandType.LID_OPEN,
        ),
      ).toBe(InterlockReason.FAULT);
    });

    it("rejects when in service mode", () => {
      expect(
        interlockReason(
          baseState({ opState: OpState.SERVICE }),
          CommandType.PLATFORM_RAISE,
        ),
      ).toBe(InterlockReason.SERVICE);
    });

    it("rejects when opState is MOVING", () => {
      expect(
        interlockReason(
          baseState({
            opState: OpState.MOVING,
            lid: LidState.MOVING,
          }),
          CommandType.LID_CLOSE,
        ),
      ).toBe(InterlockReason.MOVING);
    });

    it("rejects when an axis is MOVING even if opState is IDLE", () => {
      expect(
        interlockReason(
          baseState({
            opState: OpState.IDLE,
            lid: LidState.MOVING,
          }),
          CommandType.PLATFORM_RAISE,
        ),
      ).toBe(InterlockReason.MOVING);

      expect(
        interlockReason(
          baseState({
            opState: OpState.IDLE,
            lid: LidState.OPEN,
            platform: PlatformState.MOVING,
          }),
          CommandType.LID_CLOSE,
        ),
      ).toBe(InterlockReason.MOVING);
    });
  });

  describe("lid close requires platform down", () => {
    it("allows close when platform is down and lid is open", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.OPEN, platform: PlatformState.DOWN }),
          CommandType.LID_CLOSE,
        ),
      ).toBeNull();
    });

    it("rejects close when platform is up", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.OPEN, platform: PlatformState.UP }),
          CommandType.LID_CLOSE,
        ),
      ).toBe(InterlockReason.LID_CLOSE_PLATFORM);
    });

    it("rejects close when platform is unknown", () => {
      expect(
        interlockReason(
          baseState({
            lid: LidState.OPEN,
            platform: PlatformState.UNKNOWN,
          }),
          CommandType.LID_CLOSE,
        ),
      ).toBe(InterlockReason.LID_CLOSE_PLATFORM);
    });
  });

  describe("platform moves require lid open", () => {
    it("allows raise when lid is open and platform is down", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.OPEN, platform: PlatformState.DOWN }),
          CommandType.PLATFORM_RAISE,
        ),
      ).toBeNull();
    });

    it("allows lower when lid is open and platform is up", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.OPEN, platform: PlatformState.UP }),
          CommandType.PLATFORM_LOWER,
        ),
      ).toBeNull();
    });

    it("rejects raise when lid is closed", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.CLOSED, platform: PlatformState.DOWN }),
          CommandType.PLATFORM_RAISE,
        ),
      ).toBe(InterlockReason.PLATFORM_RAISE_LID);
    });

    it("rejects lower when lid is closed", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.CLOSED, platform: PlatformState.UP }),
          CommandType.PLATFORM_LOWER,
        ),
      ).toBe(InterlockReason.PLATFORM_LOWER_LID);
    });
  });

  describe("no-op / already-at-target", () => {
    it("rejects open when lid is already open", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.OPEN }),
          CommandType.LID_OPEN,
        ),
      ).toBe(InterlockReason.LID_ALREADY_OPEN);
    });

    it("rejects close when lid is already closed", () => {
      expect(interlockReason(baseState(), CommandType.LID_CLOSE)).toBe(
        InterlockReason.LID_ALREADY_CLOSED,
      );
    });

    it("rejects raise when platform is already up", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.OPEN, platform: PlatformState.UP }),
          CommandType.PLATFORM_RAISE,
        ),
      ).toBe(InterlockReason.PLATFORM_ALREADY_UP);
    });

    it("rejects lower when platform is already down", () => {
      expect(
        interlockReason(
          baseState({ lid: LidState.OPEN, platform: PlatformState.DOWN }),
          CommandType.PLATFORM_LOWER,
        ),
      ).toBe(InterlockReason.PLATFORM_ALREADY_DOWN);
    });
  });

  describe("happy paths", () => {
    it("allows opening a closed lid", () => {
      expect(interlockReason(baseState(), CommandType.LID_OPEN)).toBeNull();
    });
  });
});
