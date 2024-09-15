import { Level } from "./level";
import { Event } from "./event";
import { Coord } from "./coords";
import { EngineIOPacketType } from "./engine_io";
import { SocketIOPacketType } from "./socket_io";

const GG_EVENT_GENERATE_LEVEL = "generateLevel";
const GG_EVENT_RESTART_LEVEL = "restartLevel";
const GG_EVENT_GET_USER_SCORES = "getUserScores";
const GG_EVENT_RECORD_MOVE = "recordMove";

export interface Upgrade {
  engineIOPacketType: EngineIOPacketType.UPGRADE;
}

export interface Message {
  engineIOPacketType: EngineIOPacketType.MESSAGE;
  socketIOPacketType: SocketIOPacketType;
  ackId?: number;
  payload: any;
}

export type Frame = Upgrade | Message;

interface TileData {
  row: number;
  column: number;
  status: 0 | 1;
}

interface LevelData {
  rows: number;
  columns: number;
  tiles: TileData[];
}

function isLevelRequest(message: Message): boolean {
  const { socketIOPacketType, payload } = message;
  return (
    socketIOPacketType == SocketIOPacketType.EVENT &&
    Array.isArray(payload) &&
    (payload[0] === GG_EVENT_GENERATE_LEVEL ||
      payload[0] === GG_EVENT_RESTART_LEVEL)
  );
}

function isLevelData(message: Message): boolean {
  const { socketIOPacketType, payload } = message;
  return (
    socketIOPacketType == SocketIOPacketType.ACK &&
    Array.isArray(payload) &&
    Array.isArray(payload[0]?.tiles)
  );
}

function isHighScoresRequest(message: Message): boolean {
  const { socketIOPacketType, payload } = message;
  return (
    socketIOPacketType == SocketIOPacketType.EVENT &&
    Array.isArray(payload) &&
    payload[0] === GG_EVENT_GET_USER_SCORES
  );
}

function isRecordMoveEvent(message: Message): boolean {
  const { socketIOPacketType, payload } = message;
  return (
    socketIOPacketType == SocketIOPacketType.EVENT &&
    Array.isArray(payload) &&
    payload[0] === GG_EVENT_RECORD_MOVE
  );
}

function parseLevel(levelData: LevelData): Level {
  const validCoords = levelData.tiles.map(({ row, column }) => ({
    row,
    column,
  }));
  const initialLabelingVector = levelData.tiles.map(({ status }) => status);

  return {
    rows: levelData.rows,
    columns: levelData.columns,
    validCoords,
    initialLabelingVector,
  };
}

export function parseEventFromFrame(frame: Frame): Event | undefined {
  if (frame.engineIOPacketType === EngineIOPacketType.UPGRADE) {
    return { type: "CONNECTION_INIT" };
  }

  const message: Message = frame;
  const { ackId, payload } = message;

  if (isLevelRequest(message) && ackId !== undefined) {
    return { type: "LEVEL_REQUESTED", ackId };
  }
  if (isLevelData(message)) {
    const level = parseLevel(payload[0]);
    return { type: "LEVEL_DATA_RECEIVED", level };
  }
  if (isHighScoresRequest(message)) {
    return { type: "HIGH_SCORES_REQUESTED" };
  }
  if (isRecordMoveEvent(message)) {
    const [row, column] = payload[1];
    const coord: Coord = { row, column };
    return { type: "PLAYER_MOVED", coord };
  }

  return undefined;
}
