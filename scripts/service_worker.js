console.log('service-worker');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Service worker received message");
  console.log({ message, sender });
  sendResponse({ reply: "Thanks" });
  return true;
});

console.log('service-worker registered event listener');
