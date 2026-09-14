import styled from "styled-components";
import { theme } from "../../styles/theme";

export const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.space(2)};
  padding: ${theme.space(16)} ${theme.space(6)};
  border: 1px dashed ${theme.color.borderStrong};
  border-radius: ${theme.radius.lg};
  background: ${theme.color.surface};
  text-align: center;
`;

export const Heading = styled.h2`
  font-size: 16px;
  font-weight: 650;
`;

export const Body = styled.p`
  margin-bottom: ${theme.space(2)};
  color: ${theme.color.textMuted};
  font-size: 14px;
`;
