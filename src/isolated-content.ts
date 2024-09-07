import { EngineIOPacketType } from "./lib/engine_io";
import { SocketIOPacketType } from "./lib/socket_io";
import { Upgrade, Message } from "./lib/connection";

function parseFrame(engineIOPacket: any): Upgrade | Message | undefined {
  const engineIOPacketType = parseInt(engineIOPacket.charAt(0), 10);

  if (engineIOPacketType === EngineIOPacketType.UPGRADE) {
    return {
      engineIOPacketType: EngineIOPacketType.UPGRADE,
    };
  }

  if (engineIOPacketType != EngineIOPacketType.MESSAGE) {
    return;
  }

  const socketIOPacketType = parseInt(engineIOPacket.charAt(1), 10);

  if (
    socketIOPacketType != SocketIOPacketType.EVENT &&
    socketIOPacketType != SocketIOPacketType.ACK
  ) {
    return;
  }

  // Extract the acknowledgement ID (all digits after the socketIOPacketType)
  const ackIdDigits: string[] = [];
  let index = 2; // Start after the socketIOPacketType
  while (
    index < engineIOPacket.length &&
    /\d/.test(engineIOPacket.charAt(index))
  ) {
    ackIdDigits.push(engineIOPacket.charAt(index));
    index++;
  }

  // Parse the ackId as a number
  const ackId =
    ackIdDigits.length > 0 ? parseInt(ackIdDigits.join(""), 10) : undefined;

  // Extract the JSON-encoded payload (everything after the ackId)
  const payload = JSON.parse(engineIOPacket.slice(index));

  return { engineIOPacketType, socketIOPacketType, ackId, payload };
}

window.addEventListener("message", function (event) {
  // Only accept messages from the same window
  if (event.source !== window) return;

  // Check if the message is intended for the extension
  if (event.data === undefined) {
    return;
  }

  const message = parseFrame(event.data.data);
  if (message !== undefined) {
    chrome.runtime.sendMessage(message);
  }
});

chrome.runtime.onMessage.addListener(function (request, _, sendResponse) {
  if (request.message == "isSupported") {
    sendResponse(true);
    return false;
  }
});
