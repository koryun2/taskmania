import { Brand, Bar, Mark, Nav, NavLink, Wrap } from "./AppHeader.styles";
import { Button, Container, Spacer } from "../../styles/ui";
import { VIEWS } from "../../constants/views";
import type { View } from "../../constants/views";

interface AppHeaderProps {
  view: View;
  onViewChange: (view: View) => void;
  onNewTask: () => void;
}

export function AppHeader({ view, onViewChange, onNewTask }: AppHeaderProps) {
  return (
    <Wrap>
      <Container>
        <Bar>
          <Brand>
            <Mark aria-hidden="true">TM</Mark>
            TaskMania
          </Brand>

          <Nav aria-label="Views">
            {VIEWS.map((item) => (
              <NavLink
                key={item.id}
                type="button"
                $active={view === item.id}
                // aria-current marks the active view for screen readers, which
                // cannot see that it is the highlighted one.
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => onViewChange(item.id)}
              >
                {item.label}
              </NavLink>
            ))}
          </Nav>

          <Spacer />

          <Button type="button" $tone="primary" onClick={onNewTask}>
            New task
          </Button>
        </Bar>
      </Container>
    </Wrap>
  );
}
