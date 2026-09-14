import { useEffect, useId, useRef, useState } from "react";
import { Meta, MetaLabel, MetaRow } from "./TaskDetailDialog.styles";
import { formatExact, formatWhen } from "../../lib/format";
import type { Importance, Status, Task, TaskPatch } from "../../lib/types";
import { Button, FieldError, Input, Label, Select, Stack, Textarea } from "../../styles/ui";
import { STATUS_LABELS } from "../../constants/board";
import { DialogShell } from "../DialogShell";
import { ImportancePicker } from "../ImportancePicker";

interface TaskDetailDialogProps {
  task: Task;
  saving: boolean;
  onSave: (task: Task, changes: Omit<TaskPatch, "version">) => Promise<Task | null>;
  onClose: () => void;
}

export function TaskDetailDialog({ task, saving, onSave, onClose }: TaskDetailDialogProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [importance, setImportance] = useState<Importance>(task.importance);
  const [status, setStatus] = useState<Status>(task.status);
  const [titleError, setTitleError] = useState<string | null>(null);

  const titleId = useId();
  const descriptionId = useId();
  const importanceId = useId();
  const statusId = useId();
  const titleRef = useRef<HTMLInputElement>(null);

  const dirty =
    title !== task.title ||
    description !== task.description ||
    importance !== task.importance ||
    status !== task.status;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !dirty) return;

    if (title.trim() === "") {
      setTitleError("Title is required.");
      titleRef.current?.focus();
      return;
    }
    setTitleError(null);

    const saved = await onSave(task, {
      title: title.trim(),
      description: description.trim(),
      importance,
      status,
    });
    if (saved) onClose();
  };

  return (
    <DialogShell
      title="Task details"
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="task-detail-form" $tone="primary" disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="task-detail-form" onSubmit={submit} noValidate>
        <Stack $gap={5}>
          <div>
            <Label htmlFor={titleId}>Title</Label>
            <Input
              ref={titleRef}
              id={titleId}
              name="title"
              type="text"
              autoComplete="off"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              disabled={saving}
              aria-invalid={Boolean(titleError)}
            />
            {titleError ? <FieldError>{titleError}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              name="description"
              autoComplete="off"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="No description yet…"
              maxLength={2000}
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor={statusId}>Status</Label>
            <Select
              id={statusId}
              name="status"
              value={status}
              disabled={saving}
              onChange={(event) => setStatus(event.target.value as Status)}
            >
              {(Object.keys(STATUS_LABELS) as Status[]).map((option) => (
                <option key={option} value={option}>
                  {STATUS_LABELS[option]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label as="span" id={importanceId}>
              Importance
            </Label>
            <ImportancePicker
              value={importance}
              onChange={setImportance}
              disabled={saving}
              labelledBy={importanceId}
            />
          </div>

          <Meta>
            <MetaRow>
              <MetaLabel>Created</MetaLabel>
              <span title={formatExact(task.created_at)}>{formatWhen(task.created_at)}</span>
            </MetaRow>
            <MetaRow>
              <MetaLabel>Updated</MetaLabel>
              <span title={formatExact(task.updated_at)}>{formatWhen(task.updated_at)}</span>
            </MetaRow>
          </Meta>
        </Stack>
      </form>
    </DialogShell>
  );
}
