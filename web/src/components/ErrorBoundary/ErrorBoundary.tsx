import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button, Container, Stack } from "../../styles/ui";
import { EmptyState } from "../EmptyState";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Catches render errors so a bug in one component shows a recoverable message
 * instead of a blank page.
 *
 * Still a class because React has no hook equivalent for componentDidCatch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <Container>
        <Stack $gap={6} style={{ paddingTop: 64 }}>
          <EmptyState
            title="Something broke"
            body="The page ran into an unexpected error. Reloading usually clears it."
            action={{ label: "Reload", onClick: () => window.location.reload() }}
          />
          <Button type="button" onClick={() => this.setState({ failed: false })}>
            Try to continue without reloading
          </Button>
        </Stack>
      </Container>
    );
  }
}
