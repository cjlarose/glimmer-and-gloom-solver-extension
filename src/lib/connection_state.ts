import { Coord } from "./coords";

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
