import { Counts, Heading, Subtitle, Wrap } from "./PageHero.styles";
import { Row } from "../../styles/ui";

interface PageHeroProps {
  title: string;
  subtitle: string;
  /** Rendered as a live region so the count is announced after a change. */
  summary?: string;
}

export function PageHero({ title, subtitle, summary }: PageHeroProps) {
  return (
    <Wrap>
      <Row $gap={4} $wrap>
        <div>
          <Heading>{title}</Heading>
          <Subtitle>{subtitle}</Subtitle>
        </div>
      </Row>
      {summary ? (
        <Counts role="status" aria-live="polite">
          {summary}
        </Counts>
      ) : null}
    </Wrap>
  );
}
