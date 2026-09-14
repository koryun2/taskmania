import type { NewTaskInput, Page, Task, TaskPatch, TaskQuery } from "./types";

// Same-origin by default so the Vite proxy handles local runs. A deployed
// build points this at the API with VITE_API_BASE.
const BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");

/**
 * An error carrying what the server said about it.
 *
 * `status` lets callers branch on the outcome, and `fields` carries per-field
 * validation messages so a form can show them next to the right input.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  /** True when another writer changed the task first and we must refresh. */
  get isConflict(): boolean {
    return this.status === 409;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string>;
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    });
  } catch {
    // fetch only rejects when the request never completed, so this is always
    // a transport problem rather than an error status.
    throw new ApiError(0, "network_error", "Cannot reach the server. Check your connection and try again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const raw = await response.text();
  const body: unknown = raw ? safeParse(raw) : null;

  if (!response.ok) {
    const envelope = (body ?? {}) as ErrorEnvelope;
    throw new ApiError(
      response.status,
      envelope.error?.code ?? "unknown_error",
      envelope.error?.message ?? "Something went wrong. Please try again.",
      envelope.error?.fields ?? {},
    );
  }
  return body as T;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toSearch(query: TaskQuery): string {
  const params = new URLSearchParams();
  if (query.archived) params.set("archived", "true");
  if (query.open) params.set("open", "true");
  if (query.status) params.set("status", query.status);
  if (query.importance) params.set("importance", query.importance);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));

  const search = params.toString();
  return search ? `?${search}` : "";
}

export const api = {
  listTasks(query: TaskQuery = {}, signal?: AbortSignal): Promise<Page<Task>> {
    return request<Page<Task>>(`/tasks${toSearch(query)}`, { signal });
  },

  createTask(input: NewTaskInput): Promise<Task> {
    return request<Task>("/tasks", { method: "POST", body: JSON.stringify(input) });
  },

  updateTask(id: string, patch: TaskPatch): Promise<Task> {
    return request<Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  },

  deleteTask(id: string): Promise<void> {
    return request<void>(`/tasks/${id}`, { method: "DELETE" });
  },
};
