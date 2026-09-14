import { Brand, Bar, Mark, Nav, NavLink, Wrap } from "./AppHeader.styles";
import { Button, Container, Spacer } from "../../styles/ui";
import { VIEWS, hashForView } from "../../constants/views";
import type { View } from "../../constants/views";

interface AppHeaderProps {
  view: View;
  onNewTask: () => void;
}

export function AppHeader({ view, onNewTask }: AppHeaderProps) {
  return (
    <Wrap>
      <Container>
        <Bar>
          <Brand translate="no">
            <Mark aria-hidden="true">TM</Mark>
            TaskMania
          </Brand>

          <Nav aria-label="Views">
            {VIEWS.map((item) => (
              <NavLink
                key={item.id}
                href={hashForView(item.id)}
                $active={view === item.id}
                aria-current={view === item.id ? "page" : undefined}
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
