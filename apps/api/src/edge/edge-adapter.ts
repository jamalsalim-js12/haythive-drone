import { CommandType } from "@prisma/client";

export const EDGE_ADAPTER = Symbol("EDGE_ADAPTER");

export type EdgeCommandDispatch = {
  commandId: string;
  deviceId: string;
  type: CommandType;
};

export type EdgeAbortRequest = {
  commandId: string;
  deviceId: string;
  /** Original in-flight command type being aborted. */
  abortedType: CommandType;
  reason?: string;
};

/**
 * Cloud → edge command transport.
 * Real hardware / MQTT adapters implement this; the stub simulates acks in-process.
 */
export interface EdgeAdapter {
  dispatch(command: EdgeCommandDispatch): Promise<void>;
  /** Cancel an in-flight edge motion for the given command. */
  abort(request: EdgeAbortRequest): Promise<void>;
}
