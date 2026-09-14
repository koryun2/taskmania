import styled from "styled-components";
import { theme } from "../../styles/theme";
import type { BannerTone } from "./Banner";

const tones: Record<BannerTone, { fg: string; bg: string; border: string }> = {
  error: { fg: theme.color.danger, bg: theme.color.dangerSoft, border: theme.color.danger },
  success: { fg: theme.color.success, bg: theme.color.successSoft, border: theme.color.success },
};

export const Wrap = styled.div<{ $tone: BannerTone }>`
  display: flex;
  align-items: center;
  gap: ${theme.space(3)};
  padding: ${theme.space(3)} ${theme.space(4)};
  border: 1px solid ${(p) => tones[p.$tone].border};
  border-radius: ${theme.radius.md};
  background: ${(p) => tones[p.$tone].bg};
  color: ${(p) => tones[p.$tone].fg};
  font-size: 14px;
`;

export const Body = styled.div`
  flex: 1;
  min-width: 0;
`;

export const Close = styled.button`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: ${theme.radius.sm};
  background: transparent;
  color: inherit;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
`;
