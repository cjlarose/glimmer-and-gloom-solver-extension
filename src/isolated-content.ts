window.addEventListener("message", function(event) {
    // Only accept messages from the same window
    if (event.source !== window) return;

    console.log('content script');
    console.log({ event });

    // Check if the message is intended for the extension
    if (event.data === undefined) {
      return;
    }

    switch (event.data.type) {
      case "WS_MESSAGE_RECEIVED":
        // Relay the message to the service worker
        console.log('sending (received) message to service worker');
        console.log({ data: event.data.data });
        chrome.runtime.sendMessage(event.data, function(response) {
            // Send the response back to the main world
            console.log("(received) Content script got response from service worker");
            console.log({ response });
        });
        console.log("Enqueued message to send to service worker");
        break;
      case "WS_MESSAGE_SENT":
        console.log('sending (sent) message to service worker');
        console.log({ data: event.data.data });
        chrome.runtime.sendMessage(event.data, function(response) {
            // Send the response back to the main world
            console.log("(sent) Content script got response from service worker");
            console.log({ response });
        });
        break;
    }
});
