import { Message, ConnectionState, initialState, handlePacket } from './lib/connection';

async function getSubscibedTabs(): Promise<Set<number>> {
    const { tabs } = await chrome.storage.local.get('tabs');
    if (tabs === undefined) {
        return new Set();
    }
    return new Set(tabs);
}

async function addTabSubscription(tabId: number) {
    const { tabs } = await chrome.storage.local.get('tabs');
    const tabSet = new Set(tabs);
    tabSet.add(tabId);
    return chrome.storage.local.set({ tabs: [...tabSet] });
}

async function removeTabSubscription(tabId: number) {
    const { tabs } = await chrome.storage.local.get('tabs');
    const tabSet = new Set(tabs);
    tabSet.delete(tabId);
    return chrome.storage.local.set({ tabs: [...tabSet] });
}

async function sendUpdatedStateToSubscribers(state: ConnectionState) {
    const tabs = await getSubscibedTabs();
    for (const tabId of tabs) {
        try {
            await chrome.tabs.sendMessage(tabId, state)
        } catch(e) {
            await removeTabSubscription(tabId);
        }
    }
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        chrome.storage.local.set({
            connectionState: initialState,
        });
    }
});

async function handleMessage(message: Message): Promise<void> {
    const { connectionState } = await chrome.storage.local.get('connectionState');
    const newState = handlePacket(connectionState, message);
    await chrome.storage.local.set({ connectionState: newState });
    return sendUpdatedStateToSubscribers(newState);
}

chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
    handleMessage(message).then(() => sendResponse(true));
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
    await addTabSubscription(tabId);
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
