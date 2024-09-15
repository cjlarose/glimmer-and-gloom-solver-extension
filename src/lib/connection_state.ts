import { Coord } from "./coords";

interface ConnectionInit {
  type: "INIT";
}

interface WaitingForLevelData {
  type: "WAITING_FOR_LEVEL_DATA";
  ackId: number;
}

interface ComputedSolution {
  type: "COMPUTED_SOLUTION";
  rows: number;
  columns: number;
  validCoords: Coord[];
  initialLightCoords: Coord[];
  lightCoords: Coord[];
  minimalSolution: Coord[];
  clickedCoords: Coord[];
}

export type ConnectionState =
  | ConnectionInit
  | WaitingForLevelData
  | ComputedSolution;

export const initialState: ConnectionState = { type: "INIT" };
