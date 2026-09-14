import { useCallback, useEffect, useMemo, useState } from "react";
import { InertRegion, Main, SkipLink } from "./App.styles";
import { AppHeader } from "../components/AppHeader";
import { ArchiveList } from "../components/ArchiveList";
import { Banner } from "../components/Banner";
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog";
import { EmptyState } from "../components/EmptyState";
import { LoadingBoard } from "../components/LoadingBoard";
import { NewTaskDialog } from "../components/NewTaskDialog";
import { PageHero } from "../components/PageHero";
import { TaskBoard } from "../components/TaskBoard";
import { TaskDetailDialog } from "../components/TaskDetailDialog";
import { EMPTY_COPY, hashForView, viewFromHash } from "../constants/views";
import type { View } from "../constants/views";
import { useTasks } from "../hooks/useTasks";
import type { Status, Task, TaskActions } from "../lib/types";
import { Container, Page, Stack } from "../styles/ui";

export function App() {
  const [view, setView] = useState<View>(() =>
    typeof window === "undefined" ? "board" : viewFromHash(window.location.hash),
  );
  const [composing, setComposing] = useState<{ status: Status } | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  const tasks = useTasks(view);

  useEffect(() => {
    const sync = () => setView(viewFromHash(window.location.hash));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const next = hashForView(view);
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [view]);

  const openTask = useMemo(
    () => tasks.tasks.find((task) => task.id === openTaskId) ?? null,
    [tasks.tasks, openTaskId],
  );

  const closeDetail = useCallback(() => setOpenTaskId(null), []);
  const closeComposer = useCallback(() => setComposing(null), []);
  const openComposer = useCallback((status: Status = "todo") => setComposing({ status }), []);

  const { moveTask, archiveTask, restoreTask, deleteTask, editTask, createTask, isBusy } = tasks;

  const actions: TaskActions = useMemo(
    () => ({
      onMove: moveTask,
      onArchive: (task) => {
        if (task.id === openTaskId) closeDetail();
        archiveTask(task);
      },
      onRestore: (task) => {
        if (task.id === openTaskId) closeDetail();
        restoreTask(task);
      },
      onDelete: (task) => setPendingDelete(task),
      onOpen: (task) => setOpenTaskId(task.id),
    }),
    [moveTask, archiveTask, restoreTask, openTaskId, closeDetail],
  );

  const confirmDelete = useCallback(
    (task: Task) => {
      if (task.id === openTaskId) closeDetail();
      setPendingDelete(null);
      deleteTask(task);
    },
    [deleteTask, openTaskId, closeDetail],
  );

  const dialogOpen = Boolean(composing || openTask || pendingDelete);
  const isBoard = view === "board";
  const empty = tasks.tasks.length === 0;

  return (
    <Page>
      <SkipLink href="#board-main">Skip to content</SkipLink>

      <InertRegion inert={dialogOpen || undefined}>
        <AppHeader view={view} onNewTask={() => openComposer("todo")} />

        <Main id="board-main">
          <Container>
            <PageHero
              title={isBoard ? "Your board" : "Archive"}
              subtitle={isBoard ? undefined : "Tasks you have filed away. Restore anything you still need."}
            />

            <Stack $gap={4}>
              {tasks.mutationError ? (
                <Banner tone="error" onDismiss={tasks.dismissMutationError}>
                  {tasks.mutationError}
                </Banner>
              ) : null}

              {tasks.notice ? (
                <Banner tone="success" onDismiss={tasks.dismissNotice}>
                  {tasks.notice}
                </Banner>
              ) : null}

              {tasks.loadError ? (
                <Banner tone="error" action={{ label: "Try again", onClick: tasks.reload }}>
                  {tasks.loadError}
                </Banner>
              ) : tasks.loading ? (
                <LoadingBoard />
              ) : empty ? (
                <EmptyState
                  title={EMPTY_COPY[view].title}
                  body={EMPTY_COPY[view].body}
                  action={isBoard ? { label: "Add a task", onClick: () => openComposer("todo") } : undefined}
                />
              ) : isBoard ? (
                <TaskBoard
                  tasks={tasks.tasks}
                  isBusy={isBusy}
                  actions={actions}
                  onAddToColumn={openComposer}
                />
              ) : (
                <ArchiveList tasks={tasks.tasks} isBusy={isBusy} actions={actions} />
              )}
            </Stack>
          </Container>
        </Main>
      </InertRegion>

      {composing ? (
        <NewTaskDialog
          initialStatus={composing.status}
          onCreate={createTask}
          onClose={closeComposer}
        />
      ) : null}

      {openTask ? (
        <TaskDetailDialog
          task={openTask}
          saving={isBusy(openTask.id)}
          onSave={editTask}
          onClose={closeDetail}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDeleteDialog
          task={pendingDelete}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </Page>
  );
}
