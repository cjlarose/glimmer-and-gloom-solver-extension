import { Message, Upgrade } from "./frames";
import { Preferences } from "./preferences";

export interface FrameEvent {
  type: "FRAME";
  frame: Upgrade | Message;
}

export interface PreferencesEvent {
  type: "PREFERENCES";
  preferences: Preferences;
}

export type Event = FrameEvent | PreferencesEvent;
