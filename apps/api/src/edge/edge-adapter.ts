import { CommandType } from "@prisma/client";

export const EDGE_ADAPTER = Symbol("EDGE_ADAPTER");

export type EdgeCommandDispatch = {
  commandId: string;
  deviceId: string;
  type: CommandType;
};

/**
 * Cloud → edge command transport.
 * Real hardware / MQTT adapters implement this; the stub simulates acks in-process.
 */
export interface EdgeAdapter {
  dispatch(command: EdgeCommandDispatch): Promise<void>;
}
