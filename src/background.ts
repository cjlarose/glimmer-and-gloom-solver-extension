import { handleEvent } from "./lib/worker_state";
import { parseEventFromFrame } from "./lib/frames";
import { Event, SolutionIndexChanged } from "./lib/event";
import { getWorkerState, setWorkerState } from "./lib/worker_state_storage";
import {
  getPreferences,
  addPreferencesChangeListener,
} from "./lib/preferences_storage";
import { Preferences } from "./lib/preferences";

const messageQueue: Event[] = [];
let isHandlingMessage = false;

async function handleMessage(event: Event): Promise<void> {
  messageQueue.push(event);
  if (isHandlingMessage) return;
  isHandlingMessage = true;

  while (messageQueue.length > 0) {
    const nextEvent = messageQueue.shift();
    if (nextEvent) {
      const [preferences, connectionState] = await Promise.all([
        getPreferences(),
        getWorkerState(),
      ]);
      const newState = handleEvent(preferences, connectionState, nextEvent);
      await setWorkerState(newState);
    }
  }

  isHandlingMessage = false;
}

chrome.runtime.onMessage.addListener((message: any, _, sendResponse) => {
  if (message.type === "SOLUTION_INDEX_CHANGED") {
    const solutionIndex = message.solutionIndex;
    const event: SolutionIndexChanged = {
      type: "SOLUTION_INDEX_CHANGED",
      solutionIndex,
    };
    handleMessage(event).then(() => sendResponse(true));
    return true;
  }

  const event = parseEventFromFrame(message);
  if (event !== undefined) {
    handleMessage(event).then(() => sendResponse(true));
    return true;
  }
  return false;
});

addPreferencesChangeListener((preferences: Preferences) => {
  handleMessage({ type: "PREFERENCES_UPDATED", preferences });
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
