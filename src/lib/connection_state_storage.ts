import { ConnectionState, initialState } from "./connection_state";

export async function getConnectionState(): Promise<ConnectionState> {
  const { connectionState } = await chrome.storage.local.get("connectionState");
  return connectionState === undefined ? initialState : connectionState;
}
