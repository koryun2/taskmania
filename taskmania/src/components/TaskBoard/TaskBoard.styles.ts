import styled from "styled-components";
import { theme } from "../../styles/theme";

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${theme.space(4)};
  align-items: start;

  /* Below three comfortable columns the board stacks rather than squeezing. */
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const ColumnWrap = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${theme.space(3)};
  padding: ${theme.space(4)};
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.lg};
  background: ${theme.color.surfaceMuted};
`;

export const ColumnHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${theme.space(2)};
`;

export const Name = styled.h2`
  display: flex;
  align-items: center;
  gap: ${theme.space(2)};
  font-size: 14px;
  font-weight: 650;
`;

export const Count = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: ${theme.radius.pill};
  background: ${theme.color.surface};
  border: 1px solid ${theme.color.border};
  color: ${theme.color.textMuted};
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
`;

export const Hint = styled.p`
  margin-top: 2px;
  color: ${theme.color.textFaint};
  font-size: 12px;
`;

export const Add = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.sm};
  background: ${theme.color.surface};
  color: ${theme.color.textMuted};
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: ${theme.color.accentSoft};
    border-color: ${theme.color.accent};
    color: ${theme.color.accent};
  }
`;

export const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.space(2.5)};
  min-height: 60px;
`;

export const Empty = styled.p`
  padding: ${theme.space(5)} 0;
  color: ${theme.color.textFaint};
  font-size: 13px;
  text-align: center;
`;
