import { ConnectionState, initialState } from "./connection_state";

export async function getConnectionState(): Promise<ConnectionState> {
  const { connectionState } = await chrome.storage.local.get("connectionState");
  return connectionState === undefined ? initialState : connectionState;
}

export async function setConnectionState(
  state: ConnectionState,
): Promise<void> {
  await chrome.storage.local.set({ connectionState: state });
}

export function addStateChangeListener(
  callback: (connectionState: ConnectionState) => void,
): void {
  chrome.storage.local.onChanged.addListener((changes) => {
    const stateChange = changes["connectionState"];

    if (!stateChange) {
      return;
    }

    callback(stateChange.newValue);
  });
}
