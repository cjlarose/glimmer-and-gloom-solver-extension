import { Level, Tile, TileState } from "./level";
import {
  generateAugmentedMatrix,
  solveMod2Matrix,
  getSolutionCoordinates,
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
import { Upgrade, Message } from "./frames";

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

function handleLevelDataReceived(payload: any): ConnectionState {
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

  const initialLabelingVector = generateIndicatorVector(
    validCoords,
    lightCoords,
  );
  const coefficientMatrix = generateCoefficientMatrix(
    level.rows,
    level.columns,
    validCoords,
  );

  let desiredStates = [TileState.DARK, TileState.LIGHT];
  // Randomly switch dank and light to give both a fair chance
  if (Math.random() < 0.5) {
    desiredStates = [TileState.LIGHT, TileState.DARK];
  }

  const solutionCoords = desiredStates.flatMap((desiredState) => {
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
  });

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
    rows: level.rows,
    columns: level.columns,
    validCoords,
    initialLightCoords: lightCoords,
    lightCoords,
    minimalSolution,
    clickedCoords: [],
  };
}

function handleMoveRecorded(
  state: ComputedSolution,
  payload: any,
): ConnectionState {
  const [row, column] = payload[1];
  const newClickedCoords = state.clickedCoords.find(
    (coord) => coord.row == row && coord.column == column,
  )
    ? state.clickedCoords.filter(
        (coord) => coord.row !== row || coord.column !== column,
      )
    : [...state.clickedCoords, { row, column }];

  // Multiplying the coefficient matrix by the vector representing where
  // the user has clicked gives us a vector where a 0 indicates that the
  // tile is in the same state as the initial labeling, and a 1 indicates
  // that the tile has flipped

  const { rows, columns, validCoords, initialLightCoords } = state;
  const coefficientMatrix = generateCoefficientMatrix(
    rows,
    columns,
    validCoords,
  );
  const initialLabelingVector = generateIndicatorVector(
    validCoords,
    initialLightCoords,
  );
  const clickedCoordsVector = generateIndicatorVector(
    validCoords,
    newClickedCoords,
  );
  const flippedCoordsVector = multiplyMatrixByVector(
    coefficientMatrix,
    clickedCoordsVector,
  );
  const lightCoordsVector = addVectors(
    flippedCoordsVector,
    initialLabelingVector,
  );

  const coordToIndex: Map<string, number> = new Map();
  let index = 0;
  for (const tile of validCoords) {
    coordToIndex.set(`${tile.row},${tile.column}`, index++);
  }
  const newLightCoords = validCoords.filter((coord) => {
    const index = coordToIndex.get(`${coord.row},${coord.column}`);
    return index !== undefined && lightCoordsVector[index] === 1;
  });

  return {
    ...state,
    lightCoords: newLightCoords,
    clickedCoords: newClickedCoords,
  };
}

function handleLevelRequest(ackId: number): ConnectionState {
  return {
    type: "WAITING_FOR_LEVEL_DATA",
    ackId,
  };
}

export function handlePacket(
  state: ConnectionState = initialState,
  message: Upgrade | Message,
): ConnectionState {
  if (message.engineIOPacketType === EngineIOPacketType.UPGRADE) {
    return initialState;
  }

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
        return handleLevelDataReceived(payload);
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
        return handleMoveRecorded(state, payload);
      }
      return state;
    default:
      return state;
  }
}
