import { Bar, Card, Column, Grid } from "./LoadingBoard.styles";
import { VisuallyHidden } from "../../styles/ui";
import { COLUMNS } from "../../constants/board";

/**
 * Placeholder cards while the first page loads.
 *
 * The shape matches the real board so the layout does not jump when the data
 * lands. Screen readers get a short status instead of the empty boxes.
 */
export function LoadingBoard() {
  return (
    <>
      <VisuallyHidden role="status" aria-live="polite">
        Loading tasks
      </VisuallyHidden>

      <Grid aria-hidden="true">
        {COLUMNS.map((column) => (
          <Column key={column.status}>
            {[0, 1].map((n) => (
              <Card key={n}>
                <Bar $width="70%" />
                <Bar $width="45%" />
              </Card>
            ))}
          </Column>
        ))}
      </Grid>
    </>
  );
}
