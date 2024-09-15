import { handlePacket } from "./lib/connection";
import { Upgrade, Message } from "./lib/frames";
import { Event } from "./lib/event";
import {
  getConnectionState,
  setConnectionState,
} from "./lib/connection_state_storage";
import {
  getPreferences,
  addPreferencesChangeListener,
} from "./lib/preferences_storage";
import { Preferences } from "./lib/preferences";

async function handleMessage(event: Event): Promise<void> {
  const [preferences, connectionState] = await Promise.all([
    getPreferences(),
    getConnectionState(),
  ]);
  const newState = handlePacket(preferences, connectionState, event);
  await setConnectionState(newState);
}

chrome.runtime.onMessage.addListener(
  (frame: Upgrade | Message, _, sendResponse) => {
    const event: Event = { type: "FRAME", frame };
    handleMessage(event).then(() => sendResponse(true));
    return true;
  },
);

addPreferencesChangeListener((preferences: Preferences) => {
  handleMessage({ type: "PREFERENCES", preferences });
});

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

const GG_ORIGIN = "https://www1.flightrising.com";
const GG_PATH = "/play/glimmer-and-gloom";

chrome.tabs.onUpdated.addListener(async (tabId, _, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  if (url.origin === GG_ORIGIN && url.pathname === GG_PATH) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: "side-panel.html",
      enabled: true,
    });
  } else {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false,
    });
  }
});
