import styled from "styled-components";
import { theme } from "../../styles/theme";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${theme.layer.overlay};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: ${theme.space(12)} ${theme.space(4)};
  overflow-y: auto;
  background: rgba(19, 26, 46, 0.45);
`;

export const Panel = styled.div`
  width: 100%;
  max-width: 520px;
  background: ${theme.color.surface};
  border-radius: ${theme.radius.lg};
  box-shadow: ${theme.shadow.overlay};

  /* The panel takes focus on open, but it is a container rather than a
     control, so it should not show a ring of its own. */
  &:focus {
    outline: none;
  }
`;

export const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.space(4)};
  padding: ${theme.space(5)} ${theme.space(6)};
  border-bottom: 1px solid ${theme.color.border};
`;

export const Title = styled.h2`
  font-size: 17px;
  font-weight: 650;
`;

export const Body = styled.div`
  padding: ${theme.space(6)};
`;

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${theme.space(2)};
  padding: ${theme.space(4)} ${theme.space(6)};
  border-top: 1px solid ${theme.color.border};
  background: ${theme.color.surfaceMuted};
  border-radius: 0 0 ${theme.radius.lg} ${theme.radius.lg};
`;
