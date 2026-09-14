import { Actions, Description, Footer, Head, OpenTarget, Title, Wrap } from "./TaskCard.styles";
import { Badge, Faint, Row, Spacer, VisuallyHidden } from "../../styles/ui";
import { IMPORTANCE_LABELS } from "../../constants/board";
import { theme } from "../../styles/theme";
import { formatExact, formatWhen } from "../../lib/format";
import type { Task, TaskActions } from "../../lib/types";
import { StatusActions } from "../StatusActions";
import { TaskMenu } from "../TaskMenu";

interface TaskCardProps {
  task: Task;
  busy: boolean;
  actions: TaskActions;
}

export function TaskCard({ task, busy, actions }: TaskCardProps) {
  const tone = theme.importance[task.importance];

  return (
    <Wrap $busy={busy} aria-busy={busy || undefined}>
      {/*
        A button stretched over the card makes the whole surface open the
        details, while the real controls stay separate elements above it. An
        onClick on the card itself would nest those controls inside a clickable
        region and leave the card unreachable by keyboard.
      */}
      <OpenTarget type="button" onClick={() => actions.onOpen(task)}>
        <VisuallyHidden>Open details for {task.title}</VisuallyHidden>
      </OpenTarget>

      <Head>
        <Title>{task.title}</Title>
        <Actions>
          <TaskMenu
            task={task}
            disabled={busy}
            onArchive={actions.onArchive}
            onRestore={actions.onRestore}
            onDelete={actions.onDelete}
          />
        </Actions>
      </Head>

      {task.description ? <Description>{task.description}</Description> : null}

      <Footer>
        <Row $gap={2}>
          <Badge $fg={tone.fg} $bg={tone.bg}>
            {IMPORTANCE_LABELS[task.importance]}
          </Badge>
          <Faint title={formatExact(task.updated_at)}>{formatWhen(task.updated_at)}</Faint>
        </Row>

        <Spacer />

        <Actions>
          {task.archived ? null : <StatusActions task={task} disabled={busy} onMove={actions.onMove} />}
        </Actions>
      </Footer>
    </Wrap>
  );
}
