import { ConnectionState, initialState, handlePacket } from './lib/connection';

let connectionState: ConnectionState = initialState;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  connectionState = handlePacket(connectionState, message.data);
  sendResponse({ reply: "Thanks" });

  return true;
});
