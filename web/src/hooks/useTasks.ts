import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "../lib/api";
import type { NewTaskInput, Status, Task, TaskPatch } from "../lib/types";
import { PAGE_SIZE } from "../constants/board";
import type { View } from "../constants/views";
import { useBusyIds } from "./useBusyIds";

interface TasksState {
  tasks: Task[];
  total: number;
  loading: boolean;
  /** Set when the list itself could not load, so the page shows a retry. */
  loadError: string | null;
  /** Set when one write failed; the list is still valid and stays on screen. */
  mutationError: string | null;
  notice: string | null;
}

const initialState: TasksState = {
  tasks: [],
  total: 0,
  loading: true,
  loadError: null,
  mutationError: null,
  notice: null,
};

export interface UseTasks extends TasksState {
  isBusy: (id: string) => boolean;
  reload: () => void;
  createTask: (input: NewTaskInput) => Promise<Task | null>;
  moveTask: (task: Task, status: Status) => Promise<void>;
  editTask: (task: Task, changes: Omit<TaskPatch, "version">) => Promise<Task | null>;
  archiveTask: (task: Task) => Promise<void>;
  restoreTask: (task: Task) => Promise<void>;
  deleteTask: (task: Task) => Promise<void>;
  dismissMutationError: () => void;
  dismissNotice: () => void;
}

/**
 * Owns every task list concern: loading, writes, per-task busy state, and the
 * error and notice messages the page displays.
 *
 * Writes go to the server first and the list is refreshed from the response.
 * Optimistic updates would be quicker, but with version conflicts in play a
 * rejected write would have to be rolled back, and a board that flickers
 * backwards is worse than one that waits.
 */
export function useTasks(view: View): UseTasks {
  const [state, setState] = useState<TasksState>(initialState);
  const busy = useBusyIds();

  // Bumping this re-runs the effect below, which is how reload() works.
  const [reloadToken, setReloadToken] = useState(0);

  // Guards against a slow response from a previous view overwriting the
  // current one after the user has already switched.
  const requestRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestRef.current;

    setState((current) => ({ ...current, loading: true, loadError: null }));

    api
      .listTasks({ archived: view === "archive", page: 1, limit: PAGE_SIZE }, controller.signal)
      .then((page) => {
        if (requestId !== requestRef.current) return;
        setState((current) => ({
          ...current,
          tasks: page.items,
          total: page.total,
          loading: false,
          loadError: null,
        }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || requestId !== requestRef.current) return;
        setState((current) => ({ ...current, loading: false, loadError: messageFor(error) }));
      });

    return () => controller.abort();
  }, [view, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  /**
   * Runs one write with the calling task marked busy, then applies `onDone`.
   *
   * A 409 means someone else changed the task, so the only useful response is
   * to reload and show what is actually there now.
   */
  const markBusy = busy.add;
  const clearBusy = busy.remove;

  const mutate = useCallback(
    async (id: string, run: () => Promise<void>): Promise<void> => {
      markBusy(id);
      setState((current) => ({ ...current, mutationError: null }));
      try {
        await run();
      } catch (error: unknown) {
        if (error instanceof ApiError && (error.isConflict || error.isNotFound)) {
          setState((current) => ({ ...current, mutationError: messageFor(error) }));
          reload();
          return;
        }
        setState((current) => ({ ...current, mutationError: messageFor(error) }));
      } finally {
        clearBusy(id);
      }
    },
    [markBusy, clearBusy, reload],
  );

  const replace = useCallback((updated: Task) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === updated.id ? updated : task)),
    }));
  }, []);

  const drop = useCallback((id: string, notice: string) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
      total: Math.max(0, current.total - 1),
      notice,
    }));
  }, []);

  const createTask = useCallback(
    async (input: NewTaskInput): Promise<Task | null> => {
      setState((current) => ({ ...current, mutationError: null }));
      try {
        const created = await api.createTask(input);
        setState((current) => ({
          ...current,
          tasks: [created, ...current.tasks],
          total: current.total + 1,
          notice: `Added “${created.title}”.`,
        }));
        return created;
      } catch (error: unknown) {
        // Rethrown so the dialog can show field errors next to its inputs and
        // stay open instead of closing over a failed submit.
        if (error instanceof ApiError && Object.keys(error.fields).length > 0) throw error;
        setState((current) => ({ ...current, mutationError: messageFor(error) }));
        return null;
      }
    },
    [],
  );

  const moveTask = useCallback(
    (task: Task, status: Status) =>
      mutate(task.id, async () => {
        replace(await api.updateTask(task.id, { status, version: task.version }));
      }),
    [mutate, replace],
  );

  const editTask = useCallback(
    async (task: Task, changes: Omit<TaskPatch, "version">): Promise<Task | null> => {
      let saved: Task | null = null;
      await mutate(task.id, async () => {
        saved = await api.updateTask(task.id, { ...changes, version: task.version });
        replace(saved);
      });
      return saved;
    },
    [mutate, replace],
  );

  // Archiving and restoring each remove the task from the list currently on
  // screen, because the board and the archive show opposite sets.
  const archiveTask = useCallback(
    (task: Task) =>
      mutate(task.id, async () => {
        await api.updateTask(task.id, { archived: true, version: task.version });
        drop(task.id, `Archived “${task.title}”.`);
      }),
    [mutate, drop],
  );

  const restoreTask = useCallback(
    (task: Task) =>
      mutate(task.id, async () => {
        await api.updateTask(task.id, { archived: false, version: task.version });
        drop(task.id, `Restored “${task.title}” to the board.`);
      }),
    [mutate, drop],
  );

  const deleteTask = useCallback(
    (task: Task) =>
      mutate(task.id, async () => {
        await api.deleteTask(task.id);
        drop(task.id, `Deleted “${task.title}”.`);
      }),
    [mutate, drop],
  );

  const dismissMutationError = useCallback(
    () => setState((current) => ({ ...current, mutationError: null })),
    [],
  );

  const dismissNotice = useCallback(() => setState((current) => ({ ...current, notice: null })), []);

  return {
    ...state,
    isBusy: busy.has,
    reload,
    createTask,
    moveTask,
    editTask,
    archiveTask,
    restoreTask,
    deleteTask,
    dismissMutationError,
    dismissNotice,
  };
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}
