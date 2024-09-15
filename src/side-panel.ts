import { ConnectionState } from "./lib/connection_state";
import {
  getConnectionState,
  addStateChangeListener,
} from "./lib/connection_state_storage";
import { TileState } from "./lib/level";
import symmetricDifference from "./lib/symmetric-difference";

function renderGame(state: ConnectionState): Node {
  if (state.type !== "COMPUTED_SOLUTION") {
    return document.createTextNode("To start, begin a game of Glimmer & Gloom");
  }

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

  const tileStatusMap = new Map<String, TileState>();
  for (const tile of validCoords) {
    const key = `${tile.row},${tile.column}`;
    tileStatusMap.set(
      key,
      lightSet.has(key) ? TileState.LIGHT : TileState.DARK,
    );
  }

  const levelElement = document.createElement("div");
  levelElement.classList.add("level");
  levelElement.style.setProperty("--hex-columns", columns.toString());

  for (let row = 1; row <= rows; row++) {
    for (let column = 1; column <= columns; column++) {
      const hexagon = document.createElement("div");
      hexagon.classList.add("hex");
      if (row % 2 === 0) {
        hexagon.classList.add("even-row");
      }

      hexagon.dataset.row = row.toString();
      hexagon.dataset.column = column.toString();

      const hexIn = document.createElement("div");
      hexIn.classList.add("hex-in");

      const hexLink = document.createElement("a");
      hexLink.classList.add("hex-link");

      const tileStatus = tileStatusMap.get(`${row},${column}`);
      const muted = !remainingToClick.has(`${row},${column}`);
      switch (tileStatus) {
        case TileState.DARK:
          hexLink.classList.add(`tile-status-dark${muted ? "-muted" : ""}`);
          break;
        case TileState.LIGHT:
          hexLink.classList.add(`tile-status-light${muted ? "-muted" : ""}`);
          break;
      }

      hexIn.appendChild(hexLink);
      hexagon.appendChild(hexIn);

      levelElement.appendChild(hexagon);
    }
  }

  return levelElement;
}

function render(preferences: Preferences, state: ConnectionState) {
  const root = document.querySelector<HTMLElement>("#content-root");
  if (!root) {
    return;
  }

  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }

  const levelElement = renderGame(state);
  root.appendChild(levelElement);
}

window.addEventListener("DOMContentLoaded", async () => {
  const currentState = await getConnectionState();
  render(currentState);

  addStateChangeListener(render);
});
