import { Level } from "./level";
import {
  generateAugmentedMatrix,
  solveMod2Matrix,
  generateIndicatorVector,
  addVectors,
  generateLinearTransformationForClick,
  applyLinearTransformation,
} from "./solve";
import { initialState, WorkerState, ComputedSolution } from "./worker_state";
import { Preferences } from "./preferences";
import { Event } from "./event";
import { Coord } from "./coords";

function handleLevelDataReceived(
  preferences: Preferences,
  level: Level,
): WorkerState {
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
): WorkerState {
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
): WorkerState {
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

function handleLevelRequest(ackId: number): WorkerState {
  return {
    type: "WAITING_FOR_LEVEL_DATA",
    ackId,
  };
}

export function handleEvent(
  preferences: Preferences,
  state: WorkerState = initialState,
  event: Event,
): WorkerState {
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
