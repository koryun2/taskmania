export type Status = "todo" | "in_progress" | "done";

export type Importance = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  importance: Importance;
  archived: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  status?: Status;
  importance?: Importance;
}

/**
 * A change to an existing task. `version` is required because the server
 * rejects any write that does not say which revision it is based on.
 */
export interface TaskPatch {
  title?: string;
  description?: string;
  status?: Status;
  importance?: Importance;
  archived?: boolean;
  version: number;
}

export interface TaskQuery {
  archived?: boolean;
  open?: boolean;
  status?: Status;
  importance?: Importance;
  page?: number;
  limit?: number;
}

export interface TaskActions {
  onMove: (task: Task, status: Status) => void;
  onArchive: (task: Task) => void;
  onRestore: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
}
