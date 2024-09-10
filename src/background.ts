import { handlePacket } from "./lib/connection";
import { Upgrade, Message } from "./lib/frames";
import {
  getConnectionState,
  setConnectionState,
} from "./lib/connection_state_storage";

async function handleMessage(message: Upgrade | Message): Promise<void> {
  const connectionState = await getConnectionState();
  const newState = handlePacket(connectionState, message);
  await setConnectionState(newState);
}

chrome.runtime.onMessage.addListener(
  (message: Upgrade | Message, _, sendResponse) => {
    handleMessage(message).then(() => sendResponse(true));
    return true;
  },
);

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
