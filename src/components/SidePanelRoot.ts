import { ConnectionState } from "../lib/connection_state";
import Level from "./Level";

export default function SidePanelRoot(state: ConnectionState): Node {
  if (state.type !== "COMPUTED_SOLUTION") {
    return document.createTextNode("To start, begin a game of Glimmer & Gloom");
  }

  return Level(state);
}
