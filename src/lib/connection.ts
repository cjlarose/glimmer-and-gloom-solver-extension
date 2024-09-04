import { Level, Tile, TileState } from './level';
import { generateAugmentedMatrix, solveMod2Matrix, getSolutionCoordinates } from './solve';
import { SocketIOPacketType } from './socket_io';
import { Coord } from './coords';

const GG_EVENT_GENERATE_LEVEL = "generateLevel";
const GG_EVENT_GET_USER_SCORES = "getUserScores";
const GG_EVENT_RECORD_MOVE = "recordMove";

export enum LevelDifficulty {
  EASY = 1,
  MEDIUM = 2,
  HARD = 3,
  VERY_HARD = 4,
  SPECIAL = 5,
}

interface ConnectionInit {
  type: "INIT";
}

interface WaitingForLevelData {
  type: "WAITING_FOR_LEVEL_DATA";
  ackId: number;
  difficulty: LevelDifficulty;
}

interface ComputedSolution {
  type: "COMPUTED_SOLUTION";
  difficulty: LevelDifficulty;
  level: Level;
  minimalSolution: Coord[];
  clickedCoords: Coord[];
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
  //   if sending event (record move) => update clicked coords, state computed solution
  //   if received getUserScores => init
  //   else => state computed solution

  switch (state.type) {
    case "INIT":
      if (socketIOPacketType == SocketIOPacketType.EVENT &&
          Array.isArray(payload) &&
          payload[0] === GG_EVENT_GENERATE_LEVEL &&
          ackId !== null) {
        const difficulty = payload[1];
        if (Number.isInteger(difficulty) && difficulty >= LevelDifficulty.EASY && difficulty <= LevelDifficulty.VERY_HARD) {
          return {
            type: "WAITING_FOR_LEVEL_DATA",
            ackId,
            difficulty,
          };
        }
      }
      return state;
    case "WAITING_FOR_LEVEL_DATA":
      if (socketIOPacketType == SocketIOPacketType.ACK &&
          ackId === state.ackId &&
          Array.isArray(payload)) {
        const level = parseLevel(payload[0]);

        const solutionCoords = [TileState.DARK, TileState.LIGHT].flatMap(desiredState => {
            const augmentedMatrix = generateAugmentedMatrix(level, desiredState);
            const solutions = solveMod2Matrix(augmentedMatrix);
            return getSolutionCoordinates(level, solutions);
        });

        const minimalSolution = solutionCoords.reduce((minSolution, currentSolution) => {
            return currentSolution.length < minSolution.length ? currentSolution : minSolution;
        }, solutionCoords[0]);

        return {
          type: "COMPUTED_SOLUTION",
          difficulty: state.difficulty,
          level,
          minimalSolution,
          clickedCoords: [],
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
        const difficulty = payload[1];
        if (Number.isInteger(difficulty) && difficulty >= LevelDifficulty.EASY && difficulty <= LevelDifficulty.VERY_HARD) {
          return {
            type: "WAITING_FOR_LEVEL_DATA",
            ackId,
            difficulty,
          };
        } else {
          return initialState;
        }
      } else if (socketIOPacketType == SocketIOPacketType.EVENT &&
                 Array.isArray(payload) &&
                 payload[0] === GG_EVENT_GET_USER_SCORES) {
        return initialState;
      } else if (socketIOPacketType == SocketIOPacketType.EVENT &&
                 Array.isArray(payload) &&
                 payload[0] === GG_EVENT_RECORD_MOVE) {
        const [ row, column ] = payload[1];
        const newClickedCoords = state.clickedCoords.find(coord => coord.row == row && coord.column == column)
          ? state.clickedCoords.filter(coord => coord.row !== row || coord.column !== column)
          : [...state.clickedCoords, { row, column }];

        return {
          ...state,
          clickedCoords: newClickedCoords,
        };
      }
      return state;
    default:
      return state;
  }
};
