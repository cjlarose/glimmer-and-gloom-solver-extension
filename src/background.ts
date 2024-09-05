import { Message, initialState, handlePacket } from './lib/connection';

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        chrome.storage.local.set({
            connectionState: initialState,
        });
    }
});

chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
    chrome.storage.local.get('connectionState').then(({ connectionState }) => {
        const newState = handlePacket(connectionState, message);
        chrome.storage.local.set({
            connectionState: newState,
        });
        sendResponse(newState);
    })

    return true;
});

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

const GG_ORIGIN = 'https://www1.flightrising.com';
const GG_PATH = '/play/glimmer-and-gloom';

chrome.tabs.onUpdated.addListener(async (tabId, _, tab) => {
  if (!tab.url) return;
  const url = new URL(tab.url);
  if (url.origin === GG_ORIGIN && url.pathname === GG_PATH) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'side-panel.html',
      enabled: true
    });
  } else {
    await chrome.sidePanel.setOptions({
      tabId,
      enabled: false
    });
  }
});
