import styled from "styled-components";
import { theme } from "../../styles/theme";

export const Meta = styled.dl`
  display: flex;
  flex-direction: column;
  gap: ${theme.space(2)};
  margin: 0;
  padding-top: ${theme.space(4)};
  border-top: 1px solid ${theme.color.border};
  color: ${theme.color.textMuted};
  font-size: 13px;
`;

export const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${theme.space(4)};
`;

export const MetaLabel = styled.dt`
  color: ${theme.color.textFaint};
`;
