import { Preferences } from "../lib/preferences";

export default function HowTo(
  preferences: Preferences,
  onPreferencesChanged: (preferences: Preferences) => void,
): Node {
  if (!preferences.showHelpText) {
    return document.createDocumentFragment();
  }

  const div = document.createElement("div");
  div.classList.add("how-to");

  const p = document.createElement("p");
  p.appendChild(
    document.createTextNode(
      "For each bright purple or bright yellow tile above, click the corresponding tile on the game on Flight Rising",
    ),
  );
  div.appendChild(p);

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("close");
  button.dataset.dismiss = "alert";
  button.setAttribute("aria-label", "Close");
  button.addEventListener("click", () => {
    onPreferencesChanged({ ...preferences, showHelpText: false });
  });
  div.appendChild(button);

  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.textContent = "×";
  button.appendChild(span);

  return div;
}
