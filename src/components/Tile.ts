import { TileState } from "../lib/level";

export default function Tile(props: {
  row: number;
  column: number;
  tileState?: TileState;
  muted: boolean;
}): Node {
  const { row, column, tileState, muted } = props;
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

  switch (tileState) {
    case TileState.DARK:
      hexLink.classList.add(`tile-status-dark${muted ? "-muted" : ""}`);
      break;
    case TileState.LIGHT:
      hexLink.classList.add(`tile-status-light${muted ? "-muted" : ""}`);
      break;
  }

  hexIn.appendChild(hexLink);
  hexagon.appendChild(hexIn);
  return hexagon;
}
