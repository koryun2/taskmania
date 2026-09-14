import styled from "styled-components";
import { theme } from "../../styles/theme";

export const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.space(2)};
  padding: ${theme.space(8)} 0 ${theme.space(6)};
`;

export const Heading = styled.h1`
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
`;

export const Subtitle = styled.p`
  margin-top: ${theme.space(1)};
  color: ${theme.color.textMuted};
  font-size: 15px;
`;

export const Counts = styled.p`
  color: ${theme.color.textFaint};
  font-size: 13px;
`;
