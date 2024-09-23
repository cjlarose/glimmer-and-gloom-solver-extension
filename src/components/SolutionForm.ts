import { ComputedSolution } from "../lib/worker_state";
import { hammingWeight } from "../lib/solve";

function SolutionOption(index: number, solution: number[]): Node {
  const option = document.createElement("option");
  option.value = index.toString();
  option.text = `#${index} (${hammingWeight(solution)} moves)`;
  return option;
}

export default function SolutionForm(
  state: ComputedSolution,
  onSolutionIndexChanged: (solutionIndex: number) => void,
): Node {
  const fragment = document.createDocumentFragment();

  const solutionCount = document.createElement("p");
  solutionCount.appendChild(
    document.createTextNode(`Found ${state.solutions.length} solutions`),
  );
  fragment.appendChild(solutionCount);

  const form = document.createElement("form");
  form.classList.add("solution-form");
  fragment.appendChild(form);

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

  return fragment;
}
