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
