import { Level } from "./level";
import {
  generateAugmentedMatrix,
  solveMod2Matrix,
  generateIndicatorVector,
  addVectors,
  generateLinearTransformationForClick,
  applyLinearTransformation,
} from "./solve";
import { EngineIOPacketType } from "./engine_io";
import { SocketIOPacketType } from "./socket_io";
import {
  initialState,
  ConnectionState,
  ComputedSolution,
} from "./connection_state";
import { Preferences } from "./preferences";
import { Frame, Message } from "./frames";
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

  const linearTransformation = generateLinearTransformationForClick(
    level.rows,
    level.columns,
    validCoords,
  );

  const desiredState = preferences.winner;
  const desiredLabelingVector = generateIndicatorVector(
    validCoords,
    () => desiredState,
  );
  const parityVector = addVectors(desiredLabelingVector, initialLabelingVector);
  const augmentedMatrix = generateAugmentedMatrix(
    linearTransformation,
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
    linearTransformation,
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
    linearTransformation,
    initialLabelingVector,
    changedCoordsVector,
  } = state;

  const flippedCoordsVector = applyLinearTransformation(
    linearTransformation,
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

export function handleEvent(
  preferences: Preferences,
  state: ConnectionState = initialState,
  event: Event,
): ConnectionState {
  switch (state.type) {
    case "INIT":
      switch (event.type) {
        case "LEVEL_REQUESTED":
          return handleLevelRequest(event.ackId);
        default:
          return state;
      }
    case "WAITING_FOR_LEVEL_DATA":
      switch (event.type) {
        case "LEVEL_DATA_RECEIVED":
          return handleLevelDataReceived(preferences, event.level);
        case "HIGH_SCORES_REQUESTED":
          return initialState;
        default:
          return state;
      }
    case "COMPUTED_SOLUTION":
      switch (event.type) {
        case "LEVEL_REQUESTED":
          return handleLevelRequest(event.ackId);
        case "HIGH_SCORES_REQUESTED":
          return initialState;
        case "PLAYER_MOVED":
          return handleMoveRecorded(state, event.coord);
        case "PREFERENCES_UPDATED":
          return handlePreferencesChanged(state, preferences);
        default:
          return state;
      }
    default:
      return state;
  }
}
