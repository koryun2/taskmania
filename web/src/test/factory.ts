import type { Page, Task } from "../lib/types";

let counter = 0;

/** A task with sensible defaults, so tests only state what they care about. */
export function makeTask(overrides: Partial<Task> = {}): Task {
  counter += 1;
  const now = new Date().toISOString();
  return {
    id: `task-${counter}`,
    title: `Task ${counter}`,
    description: "",
    status: "todo",
    importance: "medium",
    archived: false,
    version: 1,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

export function makePage(items: Task[]): Page<Task> {
  return { items, page: 1, limit: 50, total: items.length };
}
