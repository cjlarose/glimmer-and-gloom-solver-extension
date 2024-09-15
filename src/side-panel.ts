import { ConnectionState } from "./lib/connection_state";
import {
  getConnectionState,
  addStateChangeListener,
} from "./lib/connection_state_storage";
import { Preferences } from "./lib/preferences";
import {
  addPreferencesChangeListener,
  getPreferences,
} from "./lib/preferences_storage";
import SidePanelRoot from "./components/SidePanelRoot";

function render(preferences: Preferences, state: ConnectionState) {
  const root = document.querySelector<HTMLElement>("#content-root");
  if (!root) {
    return;
  }

  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }

  root.appendChild(SidePanelRoot(preferences, state));
}

window.addEventListener("DOMContentLoaded", async () => {
  let [preferences, connectionState] = await Promise.all([
    getPreferences(),
    getConnectionState(),
  ]);
  render(preferences, connectionState);

  addStateChangeListener((newConnectionState) => {
    connectionState = newConnectionState;
    render(preferences, connectionState);
  });

  addPreferencesChangeListener((newPreferences) => {
    preferences = newPreferences;
    render(preferences, connectionState);
  });
});
