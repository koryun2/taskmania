import styled from "styled-components";
import { theme } from "../../styles/theme";

export const Wrap = styled.header`
  position: sticky;
  top: 0;
  z-index: ${theme.layer.menu - 1};
  background: ${theme.color.surface};
  border-bottom: 1px solid ${theme.color.border};
`;

export const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.space(6)};
  height: 64px;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.space(2.5)};
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
`;

export const Mark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: ${theme.radius.md};
  background: ${theme.color.accent};
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
`;

export const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${theme.space(1)};
  padding: 3px;
  border-radius: ${theme.radius.md};
  background: ${theme.color.surfaceMuted};
`;

export const NavLink = styled.button<{ $active: boolean }>`
  padding: ${theme.space(1.5)} ${theme.space(3)};
  border: none;
  border-radius: ${theme.radius.sm};
  background: ${(p) => (p.$active ? theme.color.surface : "transparent")};
  color: ${(p) => (p.$active ? theme.color.text : theme.color.textMuted)};
  box-shadow: ${(p) => (p.$active ? theme.shadow.card : "none")};
  font-size: 14px;
  font-weight: ${(p) => (p.$active ? 600 : 500)};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    color: ${theme.color.text};
  }
`;
