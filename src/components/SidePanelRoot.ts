import { WorkerState } from "../lib/worker_state";
import { Preferences } from "../lib/preferences";
import Level from "./Level";
import PreferencesForm from "./PreferencesForm";
import SolutionForm from "./SolutionForm";

export default function SidePanelRoot(
  preferences: Preferences,
  state: WorkerState,
  onPreferencesChanged: (preferences: Preferences) => void,
  onSolutionIndexChanged: (solutionIndex: number) => void,
): Node {
  if (state.type !== "COMPUTED_SOLUTION") {
    return document.createTextNode("To start, begin a game of Glimmer & Gloom");
  }

  const fragment = document.createDocumentFragment();
  fragment.appendChild(PreferencesForm(preferences, onPreferencesChanged));
  fragment.appendChild(Level(state));
  fragment.appendChild(SolutionForm(state, onSolutionIndexChanged));

  return fragment;
}
