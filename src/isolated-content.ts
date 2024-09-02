import { SocketIOPacketType } from './lib/socket_io';

const ENGINE_IO_PACKET_TYPE_MESSAGE = 4;

window.addEventListener("message", function(event) {
  // Only accept messages from the same window
  if (event.source !== window) return;

  // Check if the message is intended for the extension
  if (event.data === undefined) {
      return;
  }

  const engineIOPacket = event.data.data;
  const engineIOPacketType = parseInt(engineIOPacket.charAt(0), 10);
  if (engineIOPacketType != ENGINE_IO_PACKET_TYPE_MESSAGE) {
      return;
  }

  const socketIOPacketType = parseInt(engineIOPacket.charAt(1), 10);

  if (socketIOPacketType != SocketIOPacketType.EVENT && socketIOPacketType != SocketIOPacketType.ACK) {
      return;
  }

  // Extract the acknowledgement ID (all digits after the socketIOPacketType)
  const ackIdDigits: string[] = [];
  let index = 2; // Start after the socketIOPacketType
  while (index < engineIOPacket.length && /\d/.test(engineIOPacket.charAt(index))) {
      ackIdDigits.push(engineIOPacket.charAt(index));
      index++;
  }

  // Parse the ackId as a number
  const ackId = ackIdDigits.length > 0 ? parseInt(ackIdDigits.join(''), 10) : null;

  // Extract the JSON-encoded payload (everything after the ackId)
  const payload = JSON.parse(engineIOPacket.slice(index));

  const message = { socketIOPacketType, ackId, payload };
  chrome.runtime.sendMessage(message, function(response) {
      // Send the response back to the main world
      console.log("(received) Content script got response from service worker");
      console.log({ response });
  });
});
