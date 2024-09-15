import { TileState } from "../lib/level";
import { Preferences } from "../lib/preferences";

export default function PreferencesForm(
  preferences: Preferences,
  onPreferencesChanged: (preferences: Preferences) => void,
): Node {
  const fragment = document.createDocumentFragment();
  const form = document.createElement("form");
  form.classList.add("preferences-form");
  fragment.appendChild(form);

  const label = document.createElement("label");
  label.htmlFor = "allowed-winner";
  label.textContent = "Solve for:";
  form.appendChild(label);

  const select = document.createElement("select");
  select.name = "allowed-winner";
  select.id = "allowed-winner";

  const darkOption = document.createElement("option");
  darkOption.value = "dark";
  darkOption.text = "Dark";
  select.appendChild(darkOption);

  const lightOption = document.createElement("option");
  lightOption.value = "light";
  lightOption.text = "Light";
  select.appendChild(lightOption);

  form.appendChild(select);
  select.value = preferences.winner === TileState.DARK ? "dark" : "light";

  select.addEventListener("change", () => {
    switch (select.value) {
      case "dark":
        onPreferencesChanged({
          winner: TileState.DARK,
        });
        break;
      case "light":
        onPreferencesChanged({
          winner: TileState.LIGHT,
        });
        break;
    }
  });

  return fragment;
}
