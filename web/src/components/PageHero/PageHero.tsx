import { Heading, Subtitle, Wrap } from "./PageHero.styles";

interface PageHeroProps {
  title: string;
  subtitle?: string;
}

export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <Wrap>
      <Heading>{title}</Heading>
      {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
    </Wrap>
  );
}
