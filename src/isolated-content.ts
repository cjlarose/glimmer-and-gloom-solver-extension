import { EngineIOPacketType } from "./lib/engine_io";
import { SocketIOPacketType } from "./lib/socket_io";
import { Upgrade, Message } from "./lib/frames";

function parseFrame(engineIOPacket: string): Upgrade | Message | undefined {
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
  const payload =
    result.groups?.payload !== undefined
      ? JSON.parse(result.groups?.payload)
      : undefined;

  return { engineIOPacketType, socketIOPacketType, ackId, payload };
}

window.addEventListener("message", function (event: MessageEvent<any>) {
  // Only accept messages from the same window
  if (event.source !== window) return;

  const payloadType = event.data?.type;
  if (
    payloadType !== "WS_MESSAGE_RECEIVED" &&
    payloadType !== "WS_MESSAGE_SENT"
  ) {
    return;
  }

  const payload = event.data.data;
  if (typeof payload !== "string") {
    return;
  }

  const message = parseFrame(payload);
  if (message !== undefined) {
    chrome.runtime.sendMessage(message);
  }
});
