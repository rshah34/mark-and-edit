export type LengthAction = "cut" | "speedUp" | "slowDown";

export type MarkerType = "length" | "audioVisual" | "caption";

export type MarkerStatus = "open" | "resolved" | "skipped";

export type AudioAction = "mute" | "increase" | "decrease";
export type CaptionPosition = "top" | "middle" | "bottom";

export type UIMode =
  | "landing"
  | "watching"
  | "marking"
  | "editing"
  | "finalPlayback";

export interface Marker {
  id: string;
  tSec: number;
  type: MarkerType;
  status: MarkerStatus;

  note?: string;
  durationSec?: number;

  createdAtMs: number;
  inputToCreateDelayMs: number;
  seekLatencyMs?: number;

  lengthAction?: LengthAction;
  startTimeSec?: number;
  endTimeSec?: number;
  speedFactor?: number;

  audioAction?: AudioAction;
  audioDelta?: number;
  speedLevels?: number;
  captionPosition?: CaptionPosition;
}
