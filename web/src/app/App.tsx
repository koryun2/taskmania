import { useCallback, useMemo, useState } from "react";
import { Main } from "./App.styles";
import { AppHeader } from "../components/AppHeader";
import { ArchiveList } from "../components/ArchiveList";
import { Banner } from "../components/Banner";
import { EmptyState } from "../components/EmptyState";
import { LoadingBoard } from "../components/LoadingBoard";
import { NewTaskDialog } from "../components/NewTaskDialog";
import { PageHero } from "../components/PageHero";
import { TaskBoard } from "../components/TaskBoard";
import { TaskDetailDialog } from "../components/TaskDetailDialog";
import { EMPTY_COPY } from "../constants/views";
import type { View } from "../constants/views";
import { useTasks } from "../hooks/useTasks";
import type { Status, Task, TaskActions } from "../lib/types";
import { Container, Page, Stack } from "../styles/ui";

export function App() {
  const [view, setView] = useState<View>("board");
  const [composing, setComposing] = useState<{ status: Status } | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const tasks = useTasks(view);

  // Held by id rather than by value so the dialog re-renders with the saved
  // task after a write, instead of showing a stale copy.
  const openTask = useMemo(
    () => tasks.tasks.find((task) => task.id === openTaskId) ?? null,
    [tasks.tasks, openTaskId],
  );

  const closeDetail = useCallback(() => setOpenTaskId(null), []);

  const actions: TaskActions = useMemo(
    () => ({
      onMove: (task, status) => tasks.moveTask(task, status),
      onArchive: (task) => {
        if (task.id === openTaskId) closeDetail();
        tasks.archiveTask(task);
      },
      onRestore: (task) => {
        if (task.id === openTaskId) closeDetail();
        tasks.restoreTask(task);
      },
      onDelete: (task) => {
        if (task.id === openTaskId) closeDetail();
        tasks.deleteTask(task);
      },
      onOpen: (task) => setOpenTaskId(task.id),
    }),
    [tasks, openTaskId, closeDetail],
  );

  const isBoard = view === "board";
  const empty = tasks.tasks.length === 0;

  return (
    <Page>
      <AppHeader
        view={view}
        onViewChange={setView}
        onNewTask={() => setComposing({ status: "todo" })}
      />

      <Main>
        <Container>
          <PageHero
            title={isBoard ? "Your board" : "Archive"}
            subtitle={
              isBoard
                ? "Everything you are planning, working on, and have finished."
                : "Tasks you have filed away. Restore anything you still need."
            }
            summary={tasks.loading ? undefined : `${tasks.total} ${tasks.total === 1 ? "task" : "tasks"}`}
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

            {/*
              A failed load replaces the list, because there is nothing to
              show. A failed write only shows the banner above, since the list
              on screen is still correct.
            */}
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
                action={isBoard ? { label: "Add a task", onClick: () => setComposing({ status: "todo" }) } : undefined}
              />
            ) : isBoard ? (
              <TaskBoard
                tasks={tasks.tasks}
                isBusy={tasks.isBusy}
                actions={actions}
                onAddToColumn={(status) => setComposing({ status })}
              />
            ) : (
              <ArchiveList tasks={tasks.tasks} isBusy={tasks.isBusy} actions={actions} />
            )}
          </Stack>
        </Container>
      </Main>

      {composing ? (
        <NewTaskDialog
          initialStatus={composing.status}
          onCreate={tasks.createTask}
          onClose={() => setComposing(null)}
        />
      ) : null}

      {openTask ? (
        <TaskDetailDialog
          task={openTask}
          saving={tasks.isBusy(openTask.id)}
          onSave={(task: Task, changes) => tasks.editTask(task, changes)}
          onClose={closeDetail}
        />
      ) : null}
    </Page>
  );
}
