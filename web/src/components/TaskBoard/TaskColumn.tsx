import { Add, Body, ColumnHead, ColumnWrap, Count, Empty, Hint, Name } from "./TaskBoard.styles";
import type { ColumnConfig } from "../../constants/board";
import type { Task, TaskActions } from "../../lib/types";
import { TaskCard } from "../TaskCard";

interface TaskColumnProps {
  column: ColumnConfig;
  tasks: Task[];
  isBusy: (id: string) => boolean;
  actions: TaskActions;
  /** Only the first column offers a shortcut to add, so this is optional. */
  onAdd?: () => void;
}

export function TaskColumn({ column, tasks, isBusy, actions, onAdd }: TaskColumnProps) {
  const headingId = `column-${column.status}`;

  return (
    <ColumnWrap aria-labelledby={headingId}>
      <ColumnHead>
        <div>
          <Name id={headingId}>
            {column.title}
            <Count>{tasks.length}</Count>
          </Name>
          <Hint>{column.hint}</Hint>
        </div>

        {onAdd ? (
          // Distinct from the header's "New task" so both can be found by
          // name in tests and by screen reader users.
          <Add type="button" onClick={onAdd} aria-label="Add a to-do">
            +
          </Add>
        ) : null}
      </ColumnHead>

      <Body>
        {tasks.length === 0 ? (
          <Empty>Nothing here</Empty>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} busy={isBusy(task.id)} actions={actions} />
          ))
        )}
      </Body>
    </ColumnWrap>
  );
}
