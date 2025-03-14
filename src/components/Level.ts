import { ComputedSolution } from "../lib/worker_state";
import { TileState } from "../lib/level";
import { addVectors, applyLinearTransformation } from "../lib/solve";
import Tile from "./Tile";

export default function Level(state: ComputedSolution): Node {
  const {
    rows,
    columns,
    validCoords,
    linearTransformation,
    initialLabelingVector,
    solutions,
    selectedSolutionIndex,
    changedCoordsVector,
  } = state;

  const selectedSolution = solutions[selectedSolutionIndex];
  const flippedCoordsVector = applyLinearTransformation(
    linearTransformation,
    changedCoordsVector,
  );
  const tileStateVector = addVectors(
    initialLabelingVector,
    flippedCoordsVector,
  );
  const remainingToClickVector = addVectors(
    selectedSolution,
    changedCoordsVector,
  );

  // Create a mapping of coordinates to indices in the vectors
  const coordToIndex: Map<string, number> = new Map();
  let index = 0;
  for (const tile of validCoords) {
    coordToIndex.set(`${tile.row},${tile.column}`, index++);
  }

  const levelElement = document.createElement("div");
  levelElement.classList.add("level");
  levelElement.style.setProperty("--hex-columns", columns.toString());

  for (let row = 1; row <= rows; row++) {
    for (let column = 1; column <= columns; column++) {
      const index = coordToIndex.get(`${row},${column}`);
      const tileState: TileState | undefined =
        index !== undefined ? tileStateVector[index] : undefined;
      const muted = index !== undefined && remainingToClickVector[index] === 0;
      const hexagon = Tile({
        row,
        column,
        tileState,
        muted,
      });
      levelElement.appendChild(hexagon);
    }
  }

  return levelElement;
}
