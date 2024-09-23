import { Preferences } from "./preferences";
import { Level } from "./level";
import { Coord } from "./coords";

export interface ConnectionInitEvent {
  type: "CONNECTION_INIT";
}

export interface HighScoresRequestedEvent {
  type: "HIGH_SCORES_REQUESTED";
}

export interface LevelDataReceivedEvent {
  type: "LEVEL_DATA_RECEIVED";
  level: Level;
}

export interface PlayerMovedEvent {
  type: "PLAYER_MOVED";
  coord: Coord;
}

export interface PreferencesUpdatedEvent {
  type: "PREFERENCES_UPDATED";
  preferences: Preferences;
}

export interface SolutionIndexChanged {
  type: "SOLUTION_INDEX_CHANGED";
  solutionIndex: number;
}

export type Event =
  | ConnectionInitEvent
  | HighScoresRequestedEvent
  | LevelDataReceivedEvent
  | PlayerMovedEvent
  | PreferencesUpdatedEvent
  | SolutionIndexChanged;
