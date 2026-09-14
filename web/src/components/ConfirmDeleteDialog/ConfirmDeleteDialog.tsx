import { Button } from "../../styles/ui";
import { DialogShell } from "../DialogShell";
import type { Task } from "../../lib/types";

interface ConfirmDeleteDialogProps {
  task: Task;
  onConfirm: (task: Task) => void;
  onClose: () => void;
}

export function ConfirmDeleteDialog({ task, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  return (
    <DialogShell
      title="Delete this task?"
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" $tone="danger" onClick={() => onConfirm(task)}>
            Delete task
          </Button>
        </>
      }
    >
      <p>
        “{task.title}” will be removed permanently. Archive it instead if you might
        need it later.
      </p>
    </DialogShell>
  );
}
