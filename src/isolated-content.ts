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

  const pattern = /^(?<ackId>\d+)?(?<payload>\D.*)/;
  const result = engineIOPacket.slice(2).match(pattern);

  if (result === null) {
    return;
  }

  const ackId =
    result.groups?.ackId !== undefined
      ? parseInt(result.groups?.ackId, 10)
      : undefined;
  const payload = JSON.parse(result.groups?.payload);

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
