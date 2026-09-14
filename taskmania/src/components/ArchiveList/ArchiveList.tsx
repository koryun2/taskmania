import { List } from "./ArchiveList.styles";
import type { Task, TaskActions } from "../../lib/types";
import { TaskCard } from "../TaskCard";

interface ArchiveListProps {
  tasks: Task[];
  isBusy: (id: string) => boolean;
  actions: TaskActions;
}

/**
 * Archived tasks as a single list.
 *
 * The archive is a history rather than a workflow, so splitting it by status
 * would be noise; the cards keep their status badge instead.
 */
export function ArchiveList({ tasks, isBusy, actions }: ArchiveListProps) {
  return (
    <List>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} busy={isBusy(task.id)} actions={actions} />
      ))}
    </List>
  );
}
