import { ComputedSolution } from "../lib/worker_state";
import { Preferences } from "../lib/preferences";
import SolutionForm from "./SolutionForm";

export default function AdvancedOptions(
  preferences: Preferences,
  state: ComputedSolution,
  onPreferencesChanged: (preferences: Preferences) => void,
  onSolutionIndexChanged: (solutionIndex: number) => void,
): Node {
  const wrapCollabsible = document.createElement("div");

  const checkbox = document.createElement("input");
  checkbox.id = "collapsible";
  checkbox.classList.add("toggle");
  checkbox.type = "checkbox";
  wrapCollabsible.appendChild(checkbox);

  if (preferences.showAdvancedOptions) {
    checkbox.checked = true;
  }

  checkbox.addEventListener("change", () => {
    onPreferencesChanged({
      ...preferences,
      showAdvancedOptions: checkbox.checked,
    });
  });

  const label = document.createElement("label");
  label.htmlFor = "collapsible";
  label.classList.add("lbl-toggle");
  label.textContent = "Advanced Options";
  wrapCollabsible.appendChild(label);

  const collapsibleContent = document.createElement("div");
  collapsibleContent.classList.add("collapsible-content");
  wrapCollabsible.appendChild(collapsibleContent);

  const contentInner = document.createElement("div");
  contentInner.classList.add("content-inner");
  collapsibleContent.appendChild(contentInner);

  contentInner.appendChild(SolutionForm(state, onSolutionIndexChanged));

  return wrapCollabsible;
}
