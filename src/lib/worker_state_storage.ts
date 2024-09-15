import { WorkerState, initialState } from "./worker_state";

const STORAGE_KEY = "workerState";

export async function getWorkerState(): Promise<WorkerState> {
  const { workerState } = await chrome.storage.session.get(STORAGE_KEY);
  return workerState ?? initialState;
}

export async function setWorkerState(state: WorkerState): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: state });
}

export function addStateChangeListener(
  callback: (workerState: WorkerState) => void,
): void {
  chrome.storage.session.onChanged.addListener((changes) => {
    const stateChange = changes[STORAGE_KEY];

    if (!stateChange) {
      return;
    }

    callback(stateChange.newValue);
  });
}
