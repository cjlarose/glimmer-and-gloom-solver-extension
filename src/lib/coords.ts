// https://www.redblobgames.com/grids/hexagons/#coordinates-offset
const DIRECTION_DIFFERENCES = [
    // even rows
    [[+1,  0], [+1, -1], [ 0, -1],
     [-1,  0], [ 0, +1], [+1, +1]],
    // odd rows
    [[+1,  0], [ 0, -1], [-1, -1],
     [-1,  0], [-1, +1], [ 0, +1]],
];

enum DIRECTION {
  EAST,
  NORTHEAST,
  NORTHWEST,
  WEST,
  SOUTHWEST,
  SOUTHEAST,
}

export interface Coord {
  row: number;
  column: number;
}

function getOffsetNeighbor(coord: Coord, direction: DIRECTION) {
  const parity = coord.row & 1;
  const [columnDiff, rowDiff] = DIRECTION_DIFFERENCES[parity][direction];
  return {
    row: coord.row + rowDiff,
    column: coord.column + columnDiff,
  };
}

interface GridDimensions {
  rows: number;
  columns: number;
}

export function getAllNeighbors(coord: Coord, level: GridDimensions): Coord[] {
  const neighbors: Coord[] = [];

  for (let direction in DIRECTION) {
    if (isNaN(Number(direction))) continue; // Skip non-numeric values (TypeScript enum issue)

    const neighbor = getOffsetNeighbor(coord, Number(direction));

    // Check if the neighbor is within the bounds of the level grid (1-indexed)
    if (
      neighbor.row >= 1 && neighbor.row <= level.rows &&
      neighbor.column >= 1 && neighbor.column <= level.columns
    ) {
      neighbors.push(neighbor);
    }
  }

  return neighbors;
}
