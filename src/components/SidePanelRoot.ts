import { ConnectionState } from "../lib/connection_state";
import { Preferences } from "../lib/preferences";
import Level from "./Level";
import PreferencesForm from "./PreferencesForm";

export default function SidePanelRoot(
  preferences: Preferences,
  state: ConnectionState,
): Node {
  if (state.type !== "COMPUTED_SOLUTION") {
    return document.createTextNode("To start, begin a game of Glimmer & Gloom");
  }

  const fragment = document.createDocumentFragment();
  fragment.appendChild(PreferencesForm(preferences));
  fragment.appendChild(Level(state));
  return fragment;
}
