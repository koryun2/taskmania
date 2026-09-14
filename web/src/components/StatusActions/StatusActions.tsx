import { Button } from "../../styles/ui";
import { NEXT_STEP } from "../../constants/board";
import type { Status, Task } from "../../lib/types";

interface StatusActionsProps {
  task: Task;
  disabled: boolean;
  onMove: (task: Task, status: Status) => void;
}

/**
 * The one move available from the task's current column.
 *
 * Offering every transition on every card put three buttons on each one and
 * made the common path harder to find, so a task advances a step at a time and
 * anything else is done from the detail dialog.
 */
export function StatusActions({ task, disabled, onMove }: StatusActionsProps) {
  const step = NEXT_STEP[task.status];
  if (!step) return null;

  return (
    <Button
      type="button"
      $size="sm"
      $tone={step.status === "done" ? "primary" : "neutral"}
      disabled={disabled}
      onClick={() => onMove(task, step.status)}
    >
      {step.label}
    </Button>
  );
}
