import { Level, Tile, TileState } from "./level";
import {
  generateAugmentedMatrix,
  solveMod2Matrix,
  generateDesiredLabelingVector,
  generateIndicatorVector,
  addVectors,
  generateCoefficientMatrix,
  multiplyMatrixByVector,
} from "./solve";
import { EngineIOPacketType } from "./engine_io";
import { SocketIOPacketType } from "./socket_io";
import {
  initialState,
  ConnectionState,
  ComputedSolution,
  WaitingForLevelData,
} from "./connection_state";
import { Preferences } from "./preferences";
import { Message } from "./frames";
import { Event } from "./event";
import { Coord } from "./coords";

const GG_EVENT_GENERATE_LEVEL = "generateLevel";
const GG_EVENT_RESTART_LEVEL = "restartLevel";
const GG_EVENT_GET_USER_SCORES = "getUserScores";
const GG_EVENT_RECORD_MOVE = "recordMove";

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

function isLevelData(state: WaitingForLevelData, message: Message): boolean {
  const { socketIOPacketType, ackId, payload } = message;
  return (
    socketIOPacketType == SocketIOPacketType.ACK &&
    ackId === state.ackId &&
    Array.isArray(payload)
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

function handleLevelDataReceived(
  preferences: Preferences,
  level: Level,
): ConnectionState {
  // Solve the equation Ax = d + f0, where
  //   A is the coefficient matrix,
  //   d is the desired labeling vector,
  //   f0 is the initial labeling vector.
  //
  // We compute f0 and consider both possible values for d,
  // create an augmented matrix (A | B) where B = d + f0,
  // and solve the matrix mod 2, giving us all possible indicator
  // vectors for which tiles need to be clicked.

  const { validCoords, initialLabelingVector } = level;

  const coefficientMatrix = generateCoefficientMatrix(
    level.rows,
    level.columns,
    validCoords,
  );

  const desiredState = preferences.winner;
  const desiredLabelingVector = generateDesiredLabelingVector(
    validCoords,
    desiredState,
  );
  const parityVector = addVectors(desiredLabelingVector, initialLabelingVector);
  const augmentedMatrix = generateAugmentedMatrix(
    coefficientMatrix,
    parityVector,
  );
  const solutions = solveMod2Matrix(augmentedMatrix);

  const minimalSolution = solutions
    .map((solution) => ({
      solution,
      numVertices: solution.reduce((acc, value) => acc + value, 0),
    }))
    .reduce((acc, value) =>
      value.numVertices < acc.numVertices ? value : acc,
    ).solution;

  const changedCoordsVector = generateIndicatorVector(validCoords, () => 0);

  return {
    type: "COMPUTED_SOLUTION",
    rows: level.rows,
    columns: level.columns,
    validCoords,
    coefficientMatrix,
    initialLabelingVector,
    changedCoordsVector,
    minimalSolution,
  };
}

function handleMoveRecorded(
  state: ComputedSolution,
  coord: Coord,
): ConnectionState {
  const newChangedCoordsVector = addVectors(
    state.changedCoordsVector,
    generateIndicatorVector(state.validCoords, ({ row, column }) => {
      return row == coord.row && column == coord.column ? 1 : 0;
    }),
  );

  return {
    ...state,
    changedCoordsVector: newChangedCoordsVector,
  };
}

function handlePreferencesChanged(
  state: ComputedSolution,
  preferences: Preferences,
): ConnectionState {
  const {
    rows,
    columns,
    validCoords,
    coefficientMatrix,
    initialLabelingVector,
    changedCoordsVector,
  } = state;

  const flippedCoordsVector = multiplyMatrixByVector(
    coefficientMatrix,
    changedCoordsVector,
  );
  const tileStateVector = addVectors(
    initialLabelingVector,
    flippedCoordsVector,
  );
  const level: Level = {
    rows,
    columns,
    validCoords,
    initialLabelingVector: tileStateVector,
  };

  return handleLevelDataReceived(preferences, level);
}

function handleLevelRequest(ackId: number): ConnectionState {
  return {
    type: "WAITING_FOR_LEVEL_DATA",
    ackId,
  };
}

export function handlePacket(
  preferences: Preferences,
  state: ConnectionState = initialState,
  event: Event,
): ConnectionState {
  if (event.type === "PREFERENCES") {
    if (state.type === "COMPUTED_SOLUTION") {
      return handlePreferencesChanged(state, preferences);
    }
    return state;
  }

  const frame = event.frame;
  if (frame.engineIOPacketType === EngineIOPacketType.UPGRADE) {
    return initialState;
  }

  const message: Message = frame;
  const { ackId, payload } = message;

  // state init
  //   if sending event (generate/restart level) => state waiting for level data
  //   else => state init
  // state waiting for level data
  //   if received UPGRADE => init
  //   if receiving ack => state computed solution
  //   if received getUserScores => init
  //   else => state waiting for level data
  // state computed solution
  //   if received UPGRADE => init
  //   if sending event (generate/restart level) => state waiting for level data
  //   if sending event (record move) => update clicked coords, state computed solution
  //   if received getUserScores => init
  //   else => state computed solution

  switch (state.type) {
    case "INIT":
      if (isLevelRequest(message) && ackId !== undefined) {
        return handleLevelRequest(ackId);
      }
      return state;
    case "WAITING_FOR_LEVEL_DATA":
      if (isLevelData(state, message)) {
        const level = parseLevel(payload[0]);
        return handleLevelDataReceived(preferences, level);
      }
      if (isHighScoresRequest(message)) {
        return initialState;
      }
      return state;
    case "COMPUTED_SOLUTION":
      if (isLevelRequest(message) && ackId !== undefined) {
        return handleLevelRequest(ackId);
      }
      if (isHighScoresRequest(message)) {
        return initialState;
      }
      if (isRecordMoveEvent(message)) {
        const [row, column] = payload[1];
        const coord: Coord = { row, column };
        return handleMoveRecorded(state, coord);
      }
      return state;
    default:
      return state;
  }
}
