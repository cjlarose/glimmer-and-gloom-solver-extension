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
): void {
  const root = document.querySelector<HTMLElement>("#content-root");
  if (!root) {
    return;
  }

  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }

  root.appendChild(SidePanelRoot(preferences, state, onPreferencesChanged));
}

window.addEventListener("DOMContentLoaded", async () => {
  const onPreferencesChanged = async (preferences: Preferences) => {
    await setPreferences(preferences);
  };
  let [preferences, connectionState] = await Promise.all([
    getPreferences(),
    getWorkerState(),
  ]);
  render(preferences, connectionState, onPreferencesChanged);

  addStateChangeListener((newConnectionState) => {
    connectionState = newConnectionState;
    render(preferences, connectionState, onPreferencesChanged);
  });

  addPreferencesChangeListener((newPreferences) => {
    preferences = newPreferences;
    render(preferences, connectionState, onPreferencesChanged);
  });
});
