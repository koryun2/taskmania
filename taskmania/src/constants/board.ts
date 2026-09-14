import type { Importance, Status } from "../lib/types";

export const PAGE_SIZE = 50;

export interface ColumnConfig {
  status: Status;
  title: string;
  hint: string;
}

export const COLUMNS: readonly ColumnConfig[] = [
  { status: "todo", title: "To do", hint: "Not started yet" },
  { status: "in_progress", title: "In progress", hint: "Being worked on" },
  { status: "done", title: "Done", hint: "Finished" },
] as const;

export const STATUS_LABELS: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const IMPORTANCE_OPTIONS: readonly Importance[] = ["low", "medium", "high"] as const;

/**
 * The single action offered for a task in each state. A task moves forward one
 * step at a time, so showing every possible transition would just be clutter.
 */
export const NEXT_STEP: Record<Status, { status: Status; label: string } | null> = {
  todo: { status: "in_progress", label: "Start" },
  in_progress: { status: "done", label: "Complete" },
  done: { status: "todo", label: "Reopen" },
};
