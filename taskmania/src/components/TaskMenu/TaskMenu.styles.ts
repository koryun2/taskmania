import styled from "styled-components";
import { theme } from "../../styles/theme";

export const Wrap = styled.div`
  position: relative;
  /* The open list must sit above neighbouring cards, so the wrapper is lifted
     rather than the list itself: a child cannot escape its own ancestor's
     stacking order. */
  z-index: ${theme.layer.menu};
`;

export const Dots = styled.span`
  font-size: 18px;
  line-height: 1;
`;

export const List = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 170px;
  padding: ${theme.space(1)};
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surface};
  box-shadow: ${theme.shadow.raised};
`;

export const Item = styled.button<{ $danger?: boolean }>`
  display: block;
  width: 100%;
  padding: ${theme.space(2)} ${theme.space(3)};
  border: none;
  border-radius: ${theme.radius.sm};
  background: transparent;
  color: ${(p) => (p.$danger ? theme.color.danger : theme.color.text)};
  font-size: 14px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: ${(p) => (p.$danger ? theme.color.dangerSoft : theme.color.surfaceMuted)};
  }
`;
