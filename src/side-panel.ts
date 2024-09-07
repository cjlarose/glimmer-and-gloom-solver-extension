import { ConnectionState } from "./lib/connection";
import { TileState } from "./lib/level";
import symmetricDifference from "./lib/symmetric-difference";

interface Inactive {
  type: "INACTIVE";
}

interface Active {
  type: "ACTIVE";
  connectionState: ConnectionState;
}

type UIState = Inactive | Active;

const initialState: UIState = { type: "INACTIVE" };

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
      switch (tileStatus) {
        case TileState.DARK:
          hexLink.classList.add("tile-status-dark");
          break;
        case TileState.LIGHT:
          hexLink.classList.add("tile-status-light");
          break;
      }

      if (remainingToClick.has(`${row},${column}`)) {
        hexagon.classList.add("click-required");
      }

      hexIn.appendChild(hexLink);
      hexagon.appendChild(hexIn);

      levelElement.appendChild(hexagon);
    }
  }

  root.appendChild(levelElement);
}

window.addEventListener("DOMContentLoaded", async () => {
  render(initialState);

  try {
    const port = chrome.runtime.connect();
    port.postMessage(undefined);
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
