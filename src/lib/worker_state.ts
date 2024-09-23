import { Level } from "./level";
import {
  generateAugmentedMatrix,
  solveMod2Matrix,
  generateIndicatorVector,
  addVectors,
  generateLinearTransformationForClick,
  applyLinearTransformation,
  hammingWeight,
} from "./solve";
import { Preferences } from "./preferences";
import { Event } from "./event";
import { Coord } from "./coords";

export interface WorkerInit {
  type: "INIT";
}

export interface ComputedSolution {
  type: "COMPUTED_SOLUTION";
  rows: number;
  columns: number;
  validCoords: Coord[];
  linearTransformation: number[][];
  initialLabelingVector: number[];
  solutions: number[][];
  selectedSolutionIndex: number;
  changedCoordsVector: number[];
}

export type WorkerState = WorkerInit | ComputedSolution;

export const initialState: WorkerState = { type: "INIT" };

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

  const minimalSolutionIndex = solutions
    .map((solution, index) => ({
      index,
      hammingWeight: hammingWeight(solution),
    }))
    .reduce((acc, value) =>
      value.hammingWeight < acc.hammingWeight ? value : acc,
    ).index;

  const changedCoordsVector = generateIndicatorVector(validCoords, () => 0);

  return {
    type: "COMPUTED_SOLUTION",
    rows: level.rows,
    columns: level.columns,
    validCoords,
    linearTransformation,
    initialLabelingVector,
    solutions,
    selectedSolutionIndex: minimalSolutionIndex,
    changedCoordsVector,
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

function handleSolutionIndexChanged(
  state: ComputedSolution,
  solutionIndex: number,
): WorkerState {
  return { ...state, selectedSolutionIndex: solutionIndex };
}

export function handleEvent(
  preferences: Preferences,
  state: WorkerState = initialState,
  event: Event,
): WorkerState {
  switch (state.type) {
    case "INIT":
      switch (event.type) {
        case "LEVEL_DATA_RECEIVED":
          return handleLevelDataReceived(preferences, event.level);
        default:
          return state;
      }
    case "COMPUTED_SOLUTION":
      switch (event.type) {
        case "HIGH_SCORES_REQUESTED":
          return initialState;
        case "PLAYER_MOVED":
          return handleMoveRecorded(state, event.coord);
        case "LEVEL_DATA_RECEIVED":
          return handleLevelDataReceived(preferences, event.level);
        case "PREFERENCES_UPDATED":
          return handlePreferencesChanged(state, preferences);
        case "SOLUTION_INDEX_CHANGED":
          return handleSolutionIndexChanged(state, event.solutionIndex);
        default:
          return state;
      }
    default:
      return state;
  }
}
