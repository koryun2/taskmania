import styled, { keyframes } from "styled-components";
import { theme } from "../../styles/theme";

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.45; }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${theme.space(4)};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.space(2.5)};
  padding: ${theme.space(4)};
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.lg};
  background: ${theme.color.surfaceMuted};
`;

export const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.space(2)};
  padding: ${theme.space(4)};
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surface};
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

export const Bar = styled.div<{ $width: string }>`
  width: ${(p) => p.$width};
  height: 10px;
  border-radius: ${theme.radius.pill};
  background: ${theme.color.surfaceMuted};
`;
