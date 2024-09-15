import { ConnectionState } from "./lib/connection_state";
import {
  getConnectionState,
  addStateChangeListener,
} from "./lib/connection_state_storage";
import SidePanelRoot from "./components/SidePanelRoot";

function render(preferences: Preferences, state: ConnectionState) {
  const root = document.querySelector<HTMLElement>("#content-root");
  if (!root) {
    return;
  }

  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }

  root.appendChild(SidePanelRoot(state));
}

window.addEventListener("DOMContentLoaded", async () => {
  const currentState = await getConnectionState();
  render(currentState);

  addStateChangeListener(render);
});
