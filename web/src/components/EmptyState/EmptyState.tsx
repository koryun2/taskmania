import { Body, Heading, Wrap } from "./EmptyState.styles";
import { Button } from "../../styles/ui";

interface EmptyStateProps {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <Wrap>
      <Heading>{title}</Heading>
      <Body>{body}</Body>
      {action ? (
        <Button type="button" $tone="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </Wrap>
  );
}
