import { Message, initialState, handlePacket } from './lib/connection';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log({ reason });
  if (reason === 'install') {
    chrome.storage.local.set({
      connectionState: initialState,
    });
  }
});

chrome.runtime.onMessage.addListener((message: Message, _, sendResponse) => {
  console.log({ message });

  chrome.storage.local.get('connectionState').then(({ connectionState }) => {
    const newState = handlePacket(connectionState, message);
    console.log({ newState });
    chrome.storage.local.set({
      connectionState: newState,
    });
    sendResponse({ reply: "Thanks" });
  })

  return true;
});
