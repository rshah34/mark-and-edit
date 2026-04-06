export type MarkerType = "length" | "audioVisual" | "caption";

export type MarkerStatus = "open" | "resolved" | "skipped";

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
  createdAtMs: number;
  inputToCreateDelayMs: number;
  seekLatencyMs?: number;
}
