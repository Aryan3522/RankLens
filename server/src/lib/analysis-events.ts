import { EventEmitter } from "events";

export const analysisEvents = new EventEmitter();
export const ANALYSIS_PROGRESS_EVENT = "analysis_progress";

export interface AnalysisProgressPayload {
  analysisId: number;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  message: string;
}

export function emitAnalysisProgress(payload: AnalysisProgressPayload) {
  analysisEvents.emit(ANALYSIS_PROGRESS_EVENT, payload);
}
