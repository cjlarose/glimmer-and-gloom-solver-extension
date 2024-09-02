const ENGINE_IO_PACKET_TYPE_MESSAGE = 4;
const SOCKET_IO_PACkET_TYPE_EVENT = 2;
const SOCKET_IO_PACkET_TYPE_ACK = 3;
const GG_EVENT_GENERATE_LEVEL = "generateLevel";

enum TileState {
  DARK,
  LIGHT
}

interface Tile {
  row: Number;
  column: Number;
  status: TileState;
}

interface Level {
  rows: Number;
  columns: Number;
  tiles: Tile[];
}

interface ConnectionInit {
  type: "INIT";
}

interface WaitingForLevelData {
  type: "WAITING_FOR_LEVEL_DATA";
  ackId: Number;
}

interface ReceivedLevelData {
  type: "RECEIVED_LEVEL_DATA";
  level: Level;
}

type ConnectionState = ConnectionInit | WaitingForLevelData | ReceivedLevelData;

const initialState: ConnectionState = { type: "INIT" };

interface TileData {
  row: Number;
  column: Number;
  status: 0 | 1;
}

interface LevelData {
  rows: Number;
  columns: Number;
  tiles: TileData[];
}

function parseLevel(levelData: LevelData): Level {
  const tiles: Tile[] = levelData.tiles.map((tile: TileData) => ({
    row: tile.row,
    column: tile.column,
    status: tile.status === 1 ? TileState.LIGHT : TileState.DARK
  }));

  return {
    rows: levelData.rows,
    columns: levelData.columns,
    tiles
  };
}

function handlePacket(state: ConnectionState = initialState, packet: String): ConnectionState {
  const engineIOPacket = packet;
  const engineIOPacketType = parseInt(engineIOPacket.charAt(0), 10);
  if (engineIOPacketType != ENGINE_IO_PACKET_TYPE_MESSAGE) {
    return state;
  }

  const socketIOPacketType = parseInt(engineIOPacket.charAt(1), 10);

  // Extract the acknowledgement ID (all digits after the socketIOPacketType)
  const ackIdDigits = [];
  let index = 2; // Start after the socketIOPacketType
  while (index < engineIOPacket.length && /\d/.test(engineIOPacket.charAt(index))) {
    ackIdDigits.push(engineIOPacket.charAt(index));
    index++;
  }

  // Parse the ackId as a number
  const ackId = ackIdDigits.length > 0 ? parseInt(ackIdDigits.join(''), 10) : null;

  // Extract the JSON-encoded payload (everything after the ackId)
  const payload = JSON.parse(engineIOPacket.slice(index));


  // state init
  //   if sending event (generate level) => state waiting for level data
  // state waiting for level data
  //   if receiving ack => state received level data
  // state received data
  //   if sending event (generate level) => state waiting for level data

  switch (state.type) {
    case "INIT":
      if (socketIOPacketType == SOCKET_IO_PACkET_TYPE_EVENT &&
          Array.isArray(payload) &&
          payload[0] === GG_EVENT_GENERATE_LEVEL &&
          ackId !== null) {
        return {
          type: "WAITING_FOR_LEVEL_DATA",
          ackId
        };
      }
      return state;
    case "WAITING_FOR_LEVEL_DATA":
      if (socketIOPacketType == SOCKET_IO_PACkET_TYPE_ACK &&
          ackId === state.ackId &&
          Array.isArray(payload)) {
        const level = parseLevel(payload[0]);
        return {
          type: "RECEIVED_LEVEL_DATA",
          level,
        };
      }
      return state;
    case "RECEIVED_LEVEL_DATA":
      if (socketIOPacketType == SOCKET_IO_PACkET_TYPE_EVENT &&
          Array.isArray(payload) &&
          payload[0] === GG_EVENT_GENERATE_LEVEL &&
          ackId !== null) {
        return {
          type: "WAITING_FOR_LEVEL_DATA",
          ackId
        };
      }
      return state;
    default:
      return state;
  }
};

let connectionState: ConnectionState = initialState;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Service worker received message");
  console.log({ message, sender });
  connectionState = handlePacket(connectionState, message.data);
  console.log({ connectionState });
  sendResponse({ reply: "Thanks" });

  return true;
});

console.log('service-worker registered event listener');
