import { Level, Tile, TileState } from "./level";
import {
  generateAugmentedMatrix,
  solveMod2Matrix,
  getSolutionCoordinates,
  generateDesiredLabelingVector,
  generateInitialLabelingVector,
  addVectors,
  generateCoefficientMatrix,
} from "./solve";
import { EngineIOPacketType } from "./engine_io";
import { SocketIOPacketType } from "./socket_io";
import { Coord } from "./coords";

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
  rows: number;
  columns: number;
  validCoords: Coord[];
  lightCoords: Coord[];
  minimalSolution: Coord[];
  clickedCoords: Coord[];
}

export type ConnectionState =
  | ConnectionInit
  | WaitingForLevelData
  | ComputedSolution;

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
    status: tile.status === 1 ? TileState.LIGHT : TileState.DARK,
  }));

  return {
    rows: levelData.rows,
    columns: levelData.columns,
    tiles,
  };
}

export interface Upgrade {
  engineIOPacketType: EngineIOPacketType.UPGRADE;
}

export interface Message {
  engineIOPacketType: EngineIOPacketType.MESSAGE;
  socketIOPacketType: SocketIOPacketType;
  ackId?: number;
  payload: any;
}

export function handlePacket(
  state: ConnectionState = initialState,
  message: Upgrade | Message,
): ConnectionState {
  if (message.engineIOPacketType === EngineIOPacketType.UPGRADE) {
    return initialState;
  }

  const { socketIOPacketType, ackId, payload } = message;

  // state init
  //   if sending event (generate level) => state waiting for level data
  //   else => state init
  // state waiting for level data
  //   if received UPGRADE => init
  //   if receiving ack => state computed solution
  //   if received getUserScores => init
  //   else => state waiting for level data
  // state computed solution
  //   if received UPGRADE => init
  //   if sending event (generate level) => state waiting for level data
  //   if sending event (record move) => update clicked coords, state computed solution
  //   if received getUserScores => init
  //   else => state computed solution

  switch (state.type) {
    case "INIT":
      if (
        socketIOPacketType == SocketIOPacketType.EVENT &&
        Array.isArray(payload) &&
        payload[0] === GG_EVENT_GENERATE_LEVEL &&
        ackId !== undefined
      ) {
        const difficulty = payload[1];
        return {
          type: "WAITING_FOR_LEVEL_DATA",
          ackId,
          difficulty,
        };
      }
      return state;
    case "WAITING_FOR_LEVEL_DATA":
      if (
        socketIOPacketType == SocketIOPacketType.ACK &&
        ackId === state.ackId &&
        Array.isArray(payload)
      ) {
        const level = parseLevel(payload[0]);

        const validCoords = level.tiles.map(({ row, column }) => ({
          row,
          column,
        }));
        const lightCoords = level.tiles
          .filter(({ status }) => status === TileState.LIGHT)
          .map(({ row, column }) => ({ row, column }));

        // Solve the equation Ax = d + f0, where
        //   A is the coefficient matrix,
        //   d is the desired labeling vector,
        //   f0 is the initial labeling vector.
        //
        // We compute f0 and consider both possible values for d,
        // create an augmented matrix (A | B) where B = d + f0,
        // and solve the matrix mod 2, giving us all possible indicator
        // vectors for which tiles need to be clicked.

        const initialLabelingVector = generateInitialLabelingVector(
          validCoords,
          lightCoords,
        );
        const coefficientMatrix = generateCoefficientMatrix(
          level.rows,
          level.columns,
          validCoords,
        );

        const solutionCoords = [TileState.DARK, TileState.LIGHT].flatMap(
          (desiredState) => {
            const desiredLabelingVector = generateDesiredLabelingVector(
              validCoords,
              desiredState,
            );
            const parityVector = addVectors(
              desiredLabelingVector,
              initialLabelingVector,
            );
            const augmentedMatrix = generateAugmentedMatrix(
              coefficientMatrix,
              parityVector,
            );
            const solutions = solveMod2Matrix(augmentedMatrix);
            return getSolutionCoordinates(level, solutions);
          },
        );

        const minimalSolution = solutionCoords.reduce(
          (minSolution, currentSolution) => {
            return currentSolution.length < minSolution.length
              ? currentSolution
              : minSolution;
          },
          solutionCoords[0],
        );

        return {
          type: "COMPUTED_SOLUTION",
          difficulty: state.difficulty,
          rows: level.rows,
          columns: level.columns,
          validCoords,
          lightCoords,
          minimalSolution,
          clickedCoords: [],
        };
      } else if (
        socketIOPacketType == SocketIOPacketType.EVENT &&
        Array.isArray(payload) &&
        payload[0] === GG_EVENT_GET_USER_SCORES
      ) {
        return initialState;
      }
      return state;
    case "COMPUTED_SOLUTION":
      if (
        socketIOPacketType == SocketIOPacketType.EVENT &&
        Array.isArray(payload) &&
        payload[0] === GG_EVENT_GENERATE_LEVEL &&
        ackId !== undefined
      ) {
        const difficulty = payload[1];
        return {
          type: "WAITING_FOR_LEVEL_DATA",
          ackId,
          difficulty,
        };
      } else if (
        socketIOPacketType == SocketIOPacketType.EVENT &&
        Array.isArray(payload) &&
        payload[0] === GG_EVENT_GET_USER_SCORES
      ) {
        return initialState;
      } else if (
        socketIOPacketType == SocketIOPacketType.EVENT &&
        Array.isArray(payload) &&
        payload[0] === GG_EVENT_RECORD_MOVE
      ) {
        const [row, column] = payload[1];
        const newClickedCoords = state.clickedCoords.find(
          (coord) => coord.row == row && coord.column == column,
        )
          ? state.clickedCoords.filter(
              (coord) => coord.row !== row || coord.column !== column,
            )
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
}
