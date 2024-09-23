import { WorkerState } from "./lib/worker_state";
import {
  getWorkerState,
  addStateChangeListener,
} from "./lib/worker_state_storage";
import { Preferences } from "./lib/preferences";
import {
  addPreferencesChangeListener,
  getPreferences,
  setPreferences,
} from "./lib/preferences_storage";
import SidePanelRoot from "./components/SidePanelRoot";

function render(
  preferences: Preferences,
  state: WorkerState,
  onPreferencesChanged: (preferences: Preferences) => void,
  onSolutionIndexChanged: (solutionIndex: number) => void,
): void {
  const root = document.querySelector<HTMLElement>("#content-root");
  if (!root) {
    return;
  }

  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }

  root.appendChild(
    SidePanelRoot(
      preferences,
      state,
      onPreferencesChanged,
      onSolutionIndexChanged,
    ),
  );
}

window.addEventListener("DOMContentLoaded", async () => {
  const onPreferencesChanged = async (preferences: Preferences) => {
    await setPreferences(preferences);
  };
  const onSolutionIndexChanged = async (solutionIndex: number) => {
    chrome.runtime.sendMessage({
      type: "SOLUTION_INDEX_CHANGED",
      solutionIndex,
    });
  };

  let [preferences, connectionState] = await Promise.all([
    getPreferences(),
    getWorkerState(),
  ]);
  render(
    preferences,
    connectionState,
    onPreferencesChanged,
    onSolutionIndexChanged,
  );

  addStateChangeListener((newConnectionState) => {
    connectionState = newConnectionState;
    render(
      preferences,
      connectionState,
      onPreferencesChanged,
      onSolutionIndexChanged,
    );
  });

  addPreferencesChangeListener((newPreferences) => {
    preferences = newPreferences;
    render(
      preferences,
      connectionState,
      onPreferencesChanged,
      onSolutionIndexChanged,
    );
  });
});
