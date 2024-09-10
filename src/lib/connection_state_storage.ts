import { ConnectionState, initialState } from "./connection_state";

const STORAGE_KEY = "connectionState";

export async function getConnectionState(): Promise<ConnectionState> {
  const { connectionState } = await chrome.storage.session.get(STORAGE_KEY);
  return connectionState === undefined ? initialState : connectionState;
}

export async function setConnectionState(
  state: ConnectionState,
): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: state });
}

export function addStateChangeListener(
  callback: (connectionState: ConnectionState) => void,
): void {
  chrome.storage.session.onChanged.addListener((changes) => {
    const stateChange = changes[STORAGE_KEY];

    if (!stateChange) {
      return;
    }

    callback(stateChange.newValue);
  });
}
