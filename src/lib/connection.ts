import { Level, Tile, TileState } from './level';
import { generateAugmentedMatrix, solveMod2Matrix, getSolutionCoordinates } from './solve';
import { SocketIOPacketType } from './socket_io';
import { Coord } from './coords';

const GG_EVENT_GENERATE_LEVEL = "generateLevel";
const GG_EVENT_GET_USER_SCORES = "getUserScores";

interface ConnectionInit {
  type: "INIT";
}

interface WaitingForLevelData {
  type: "WAITING_FOR_LEVEL_DATA";
  ackId: number;
}

interface ComputedSolution {
  type: "COMPUTED_SOLUTION";
  level: Level;
  minimalSolution: Coord[];
}

export type ConnectionState = ConnectionInit | WaitingForLevelData | ComputedSolution;

export const initialState: ConnectionState = { type: "INIT" };

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

export interface Message {
    socketIOPacketType: SocketIOPacketType;
    ackId: number;
    payload: any;
}

export function handlePacket(state: ConnectionState = initialState, message: Message): ConnectionState {
  console.log({ state, message });

  const { socketIOPacketType, ackId, payload } = message;

  // state init
  //   if sending event (generate level) => state waiting for level data
  //   else => state init
  // state waiting for level data
  //   if receiving ack => state computed solution
  //   if received getUserScores => init
  //   else => state waiting for level data
  // state computed solution
  //   if sending event (generate level) => state waiting for level data
  //   if received getUserScores => init
  //   else => state computed solution

  switch (state.type) {
    case "INIT":
      if (socketIOPacketType == SocketIOPacketType.EVENT &&
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
      if (socketIOPacketType == SocketIOPacketType.ACK &&
          ackId === state.ackId &&
          Array.isArray(payload)) {
        const level = parseLevel(payload[0]);
        console.log({ level });

        const solutionCoords = [TileState.DARK, TileState.LIGHT].flatMap(desiredState => {
            const augmentedMatrix = generateAugmentedMatrix(level, desiredState);
            console.log({ augmentedMatrix });
            const solutions = solveMod2Matrix(augmentedMatrix);
            console.log({ solutions });
            return getSolutionCoordinates(level, solutions);
        });

        console.log({ solutionCoords });

        const minimalSolution = solutionCoords.reduce((minSolution, currentSolution) => {
            return currentSolution.length < minSolution.length ? currentSolution : minSolution;
        }, solutionCoords[0]);

        console.log({ minimalSolution });

        return {
          type: "COMPUTED_SOLUTION",
          level,
          minimalSolution,
        };
      } else if (socketIOPacketType == SocketIOPacketType.EVENT &&
                 Array.isArray(payload) &&
                 payload[0] === GG_EVENT_GET_USER_SCORES) {
        return initialState;
      }
      return state;
    case "COMPUTED_SOLUTION":
      if (socketIOPacketType == SocketIOPacketType.EVENT &&
          Array.isArray(payload) &&
          payload[0] === GG_EVENT_GENERATE_LEVEL &&
          ackId !== null) {
        return {
          type: "WAITING_FOR_LEVEL_DATA",
          ackId
        };
      } else if (socketIOPacketType == SocketIOPacketType.EVENT &&
                 Array.isArray(payload) &&
                 payload[0] === GG_EVENT_GET_USER_SCORES) {
        return initialState;
      }
      return state;
    default:
      return state;
  }
};
