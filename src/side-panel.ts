import { ConnectionState } from "./lib/connection";
import { TileState } from "./lib/level";

interface Inactive {
  type: "INACTIVE";
}

interface Active {
  type: "ACTIVE";
  connectionState: ConnectionState;
}

type UIState = Inactive | Active;

const initialState: UIState = { type: "INACTIVE" };

function symmetricDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  const difference = new Set(setA);
  for (const elem of setB) {
    if (difference.has(elem)) {
      difference.delete(elem);
    } else {
      difference.add(elem);
    }
  }
  return difference;
}

function render(state: UIState) {
  const root = document.querySelector<HTMLElement>("#content-root");
  if (!root) {
    return;
  }

  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }

  if (
    state.type === "INACTIVE" ||
    state.connectionState.type !== "COMPUTED_SOLUTION"
  ) {
    root.appendChild(document.createTextNode("Not enabled"));
    return;
  }

  const { level, minimalSolution, clickedCoords } = state.connectionState;

  const tileSet = new Set(
    level.tiles.map(({ row, column }) => `${row},${column}`),
  );
  const solutionSet = new Set(
    minimalSolution.map(({ row, column }) => `${row},${column}`),
  );
  const clickedSet = new Set(
    clickedCoords.map(({ row, column }) => `${row},${column}`),
  );
  const remainingToClick = symmetricDifference(solutionSet, clickedSet);

  const tileStatusMap = new Map<String, TileState>();
  for (const tile of level.tiles) {
    tileStatusMap.set(`${tile.row},${tile.column}`, tile.status);
  }

  const levelElement = document.createElement("div");
  levelElement.classList.add("level");
  levelElement.style.setProperty("--hex-columns", level.columns.toString());

  for (let row = 1; row <= level.rows; row++) {
    for (let column = 1; column <= level.columns; column++) {
      const hexagon = document.createElement("div");
      hexagon.classList.add("hexagon");
      if (row % 2 === 0) {
        hexagon.classList.add("even-row");
      }

      hexagon.dataset.row = row.toString();
      hexagon.dataset.column = column.toString();

      if (remainingToClick.has(`${row},${column}`)) {
        hexagon.dataset.solution = "true";

        const span = document.createElement("span");
        span.textContent = "🔘";
        hexagon.appendChild(span);
      }

      const tileStatus = tileStatusMap.get(`${row},${column}`);
      switch (tileStatus) {
        case TileState.DARK:
          hexagon.classList.add("tile-status-dark");
          break;
        case TileState.LIGHT:
          hexagon.classList.add("tile-status-light");
          break;
      }

      levelElement.appendChild(hexagon);
    }
  }

  root.appendChild(levelElement);
}

window.addEventListener("DOMContentLoaded", async () => {
  render(initialState);

  try {
    const port = chrome.runtime.connect({ name: "knockknock" });
    port.onMessage.addListener(function (connectionState: ConnectionState) {
      const newState: UIState = {
        type: "ACTIVE",
        connectionState,
      };
      render(newState);
    });
  } catch (e) {
    console.log(`[side-panel] Got error when trying to connect`);
  }
});
