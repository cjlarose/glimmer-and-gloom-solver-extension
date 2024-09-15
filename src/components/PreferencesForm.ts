import { Preferences } from "../lib/preferences";

export default function PreferencesForm(preferences: Preferences): Node {
  const fragment = document.createDocumentFragment();
  const form = document.createElement("form");
  form.classList.add("preferences-form");
  fragment.appendChild(form);

  const select = document.createElement("select");
  select.name = "allowedWinners";

  const anyOption = document.createElement("option");
  anyOption.value = "any";
  anyOption.text = "Allow dark or light to win";
  select.appendChild(anyOption);

  const darkOption = document.createElement("option");
  darkOption.value = "dark";
  darkOption.text = "Only allow dark to win";
  select.appendChild(darkOption);

  const lightOption = document.createElement("option");
  lightOption.value = "light";
  lightOption.text = "Only allow light to win";
  select.appendChild(lightOption);

  form.appendChild(select);
  if (preferences.allowDarkToWin && preferences.allowLightToWin) {
    select.value = "any";
  } else if (preferences.allowDarkToWin) {
    select.value = "dark";
  } else {
    select.value = "light";
  }

  return fragment;
}
