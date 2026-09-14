import { useId, useState } from "react";
import { ApiError } from "../../lib/api";
import type { Importance, NewTaskInput, Status, Task } from "../../lib/types";
import { Button, FieldError, Input, Label, Stack, Textarea } from "../../styles/ui";
import { Banner } from "../Banner";
import { DialogShell } from "../DialogShell";
import { ImportancePicker } from "../ImportancePicker";

interface NewTaskDialogProps {
  /** The column the dialog was opened from, so the task lands where expected. */
  initialStatus?: Status;
  onCreate: (input: NewTaskInput) => Promise<Task | null>;
  onClose: () => void;
}

export function NewTaskDialog({ initialStatus = "todo", onCreate, onClose }: NewTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [importance, setImportance] = useState<Importance>("medium");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const titleId = useId();
  const descriptionId = useId();
  const importanceId = useId();
  const titleErrorId = `${titleId}-error`;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    // Checked here as well as on the server so the common mistake is caught
    // without a round trip.
    if (title.trim() === "") {
      setFieldErrors({ title: "Title is required." });
      return;
    }

    setSaving(true);
    setFieldErrors({});
    setFormError(null);
    try {
      const created = await onCreate({
        title: title.trim(),
        description: description.trim(),
        status: initialStatus,
        importance,
      });
      if (created) onClose();
    } catch (error: unknown) {
      // Field errors belong next to their inputs, so the dialog stays open.
      if (error instanceof ApiError) {
        setFieldErrors(error.fields);
        if (Object.keys(error.fields).length === 0) setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      title="New task"
      onClose={onClose}
      footer={
        <>
          <Button type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="new-task-form" $tone="primary" disabled={saving}>
            {saving ? "Adding…" : "Add task"}
          </Button>
        </>
      }
    >
      <form id="new-task-form" onSubmit={submit} noValidate>
        <Stack $gap={5}>
          {formError ? <Banner tone="error">{formError}</Banner> : null}

          <div>
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs doing?"
              maxLength={200}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? titleErrorId : undefined}
            />
            {fieldErrors.title ? <FieldError id={titleErrorId}>{fieldErrors.title}</FieldError> : null}
          </div>

          <div>
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Any detail worth remembering (optional)"
              maxLength={2000}
              aria-invalid={Boolean(fieldErrors.description)}
            />
            {fieldErrors.description ? <FieldError>{fieldErrors.description}</FieldError> : null}
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
        </Stack>
      </form>
    </DialogShell>
  );
}
