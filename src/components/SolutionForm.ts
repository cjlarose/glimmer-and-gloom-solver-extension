import { ComputedSolution } from "../lib/worker_state";
import { hammingWeight } from "../lib/solve";

function SolutionOption(index: number, solution: number[]): Node {
  const option = document.createElement("option");
  option.value = index.toString();
  option.text = `#${index} (${hammingWeight(solution)} moves)`;
  return option;
}

function SolutionSelect(
  state: ComputedSolution,
  onSolutionIndexChanged: (solutionIndex: number) => void,
) {
  const form = document.createElement("form");
  form.classList.add("solution-form");

  const select = document.createElement("select");
  select.name = "solution-index";

  for (let i = 0; i < state.solutions.length; i++) {
    select.appendChild(SolutionOption(i, state.solutions[i]));
  }

  form.appendChild(select);

  select.value = state.selectedSolutionIndex.toString();

  select.addEventListener("change", () => {
    const indexStr = select.value;
    onSolutionIndexChanged(parseInt(indexStr, 10));
  });

  return form;
}

function SolutionCount(state: ComputedSolution) {
  const blurb = document.createElement("p");
  const numSolutions = state.solutions.length;
  const text =
    numSolutions === 1
      ? `Found 1 solution (${hammingWeight(state.solutions[0])} moves)`
      : `Found ${numSolutions} solutions`;
  blurb.appendChild(document.createTextNode(text));
  return blurb;
}

export default function SolutionForm(
  state: ComputedSolution,
  onSolutionIndexChanged: (solutionIndex: number) => void,
): Node {
  const fragment = document.createDocumentFragment();

  fragment.appendChild(SolutionCount(state));

  if (state.solutions.length > 1) {
    fragment.appendChild(SolutionSelect(state, onSolutionIndexChanged));
  }

  return fragment;
}
