import {
  Message,
  ConnectionState,
  initialState,
  handlePacket,
} from "./lib/connection";

async function getConnectionState(): Promise<ConnectionState> {
  const { connectionState } = await chrome.storage.local.get("connectionState");
  return connectionState;
}

async function sendUpdatedStateToSubscribers(state: ConnectionState) {
  for (const port of activePorts) {
    port.postMessage(state);
  }
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set({
      connectionState: initialState,
    });
  }
});

async function handleMessage(message: Message): Promise<void> {
  const connectionState = await getConnectionState();
  const newState = handlePacket(connectionState, message);
  await chrome.storage.local.set({ connectionState: newState });
  return sendUpdatedStateToSubscribers(newState);
}

chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
  handleMessage(message).then(() => sendResponse(true));
  return true;
});

const activePorts: chrome.runtime.Port[] = [];

chrome.runtime.onConnect.addListener((port) => {
  activePorts.push(port);
  port.onMessage.addListener(async () => {
    const connectionState = await getConnectionState();
    port.postMessage(connectionState);
  });
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
