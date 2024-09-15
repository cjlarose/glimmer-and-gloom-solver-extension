import { Coord } from "./coords";

export enum TileState {
  DARK,
  LIGHT,
}

export interface Tile {
  row: number;
  column: number;
  status: TileState;
}

export interface Level {
  rows: number;
  columns: number;
  validCoords: Coord[];
  initialLabelingVector: number[];
}
