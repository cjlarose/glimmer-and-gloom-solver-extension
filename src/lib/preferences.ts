import { TileState } from "./level";
export const defaultPreferences = {
  winner: TileState.DARK,
};

export type Preferences = typeof defaultPreferences;
