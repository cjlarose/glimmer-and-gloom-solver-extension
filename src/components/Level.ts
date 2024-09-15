import { ComputedSolution } from "../lib/connection_state";
import { TileState } from "../lib/level";
import symmetricDifference from "../lib/symmetric-difference";
import Tile from "./Tile";

export default function Level(state: ComputedSolution): Node {
  const {
    rows,
    columns,
    validCoords,
    lightCoords,
    minimalSolution,
    clickedCoords,
  } = state;

  const lightSet = new Set(
    lightCoords.map(({ row, column }) => `${row},${column}`),
  );
  const solutionSet = new Set(
    minimalSolution.map(({ row, column }) => `${row},${column}`),
  );
  const clickedSet = new Set(
    clickedCoords.map(({ row, column }) => `${row},${column}`),
  );
  const remainingToClick = symmetricDifference(solutionSet, clickedSet);

  const tileStateMap = new Map<String, TileState>();
  for (const tile of validCoords) {
    const key = `${tile.row},${tile.column}`;
    tileStateMap.set(key, lightSet.has(key) ? TileState.LIGHT : TileState.DARK);
  }

  const levelElement = document.createElement("div");
  levelElement.classList.add("level");
  levelElement.style.setProperty("--hex-columns", columns.toString());

  for (let row = 1; row <= rows; row++) {
    for (let column = 1; column <= columns; column++) {
      const hexagon = Tile({
        row,
        column,
        tileState: tileStateMap.get(`${row},${column}`),
        muted: !remainingToClick.has(`${row},${column}`),
      });
      levelElement.appendChild(hexagon);
    }
  }

  return levelElement;
}
