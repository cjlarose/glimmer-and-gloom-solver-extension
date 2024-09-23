import { TileState } from "./level";
export const defaultPreferences = {
  winner: TileState.DARK,
  showAdvancedOptions: false,
  showHelpText: true,
};

export type Preferences = typeof defaultPreferences;
