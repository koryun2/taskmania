import { useMemo } from "react";
import { Grid } from "./TaskBoard.styles";
import { TaskColumn } from "./TaskColumn";
import { COLUMNS } from "../../constants/board";
import type { Status, Task, TaskActions } from "../../lib/types";

interface TaskBoardProps {
  tasks: Task[];
  isBusy: (id: string) => boolean;
  actions: TaskActions;
  onAddToColumn: (status: Status) => void;
}

export function TaskBoard({ tasks, isBusy, actions, onAddToColumn }: TaskBoardProps) {
  const byStatus = useMemo(() => {
    const groups: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of tasks) {
      groups[task.status].push(task);
    }
    return groups;
  }, [tasks]);

  return (
    <Grid>
      {COLUMNS.map((column) => (
        <TaskColumn
          key={column.status}
          column={column}
          tasks={byStatus[column.status]}
          isBusy={isBusy}
          actions={actions}
          onAdd={column.status === "todo" ? () => onAddToColumn(column.status) : undefined}
        />
      ))}
    </Grid>
  );
}
