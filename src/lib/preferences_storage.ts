import { Preferences, defaultPreferences } from "./preferences";

const STORAGE_KEY = "preferences";

export async function getPreferences(): Promise<Preferences> {
  const { preferences } = await chrome.storage.session.get(STORAGE_KEY);
  if (preferences === undefined) {
    return defaultPreferences;
  }
  return Object.assign({}, defaultPreferences, preferences);
}

export async function setPreferences(preferences: Preferences): Promise<void> {
  await chrome.storage.session.set({ [STORAGE_KEY]: preferences });
}

export function addPreferencesChangeListener(
  callback: (preferences: Preferences) => void,
): void {
  chrome.storage.session.onChanged.addListener((changes) => {
    const stateChange = changes[STORAGE_KEY];

    if (!stateChange) {
      return;
    }

    callback(stateChange.newValue);
  });
}
