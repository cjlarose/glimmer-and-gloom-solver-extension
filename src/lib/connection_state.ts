import { Coord } from "./coords";

export interface ConnectionInit {
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

export type ConnectionState =
  | ConnectionInit
  | WaitingForLevelData
  | ComputedSolution;

export const initialState: ConnectionState = { type: "INIT" };
