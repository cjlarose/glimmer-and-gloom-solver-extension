import { TileState } from "./level";
export const defaultPreferences = {
  winner: TileState.DARK,
  showAdvancedOptions: false,
};

export type Preferences = typeof defaultPreferences;
