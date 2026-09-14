import styled from "styled-components";
import { theme } from "../../styles/theme";
import type { Importance } from "../../lib/types";

export const Group = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 3px;
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surfaceMuted};
`;

export const Option = styled.button<{ $selected: boolean; $level: Importance }>`
  padding: ${theme.space(1.5)} ${theme.space(3.5)};
  border: none;
  border-radius: ${theme.radius.sm};
  background: ${(p) => (p.$selected ? theme.importance[p.$level].bg : "transparent")};
  color: ${(p) => (p.$selected ? theme.importance[p.$level].fg : theme.color.textMuted)};
  font-size: 13px;
  font-weight: ${(p) => (p.$selected ? 650 : 500)};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    color: ${theme.color.text};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
