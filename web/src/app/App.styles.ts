import styled from "styled-components";
import { theme } from "../styles/theme";

export const SkipLink = styled.a`
  position: absolute;
  left: ${theme.space(4)};
  top: ${theme.space(2)};
  z-index: ${theme.layer.overlay + 1};
  padding: ${theme.space(2)} ${theme.space(3)};
  border-radius: ${theme.radius.md};
  background: ${theme.color.accent};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-150%);

  &:focus {
    transform: none;
  }
`;

export const Main = styled.main`
  flex: 1;
  padding-bottom: ${theme.space(20)};
  scroll-margin-top: 80px;
`;

export const InertRegion = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
`;
