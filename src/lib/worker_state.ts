import { Coord } from "./coords";

export interface WorkerInit {
  type: "INIT";
}

export interface WaitingForLevelData {
  type: "WAITING_FOR_LEVEL_DATA";
  ackId: number;
}

export interface ComputedSolution {
  type: "COMPUTED_SOLUTION";
  rows: number;
  columns: number;
  validCoords: Coord[];
  linearTransformation: number[][];
  initialLabelingVector: number[];
  changedCoordsVector: number[];
  minimalSolution: number[];
}

export type WorkerState = WorkerInit | WaitingForLevelData | ComputedSolution;

export const initialState: WorkerState = { type: "INIT" };
