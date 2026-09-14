import { createGlobalStyle } from "styled-components";
import { theme } from "./theme";

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
  }

  body {
    margin: 0;
    background: ${theme.color.canvas};
    color: ${theme.color.text};
    font-family: ${theme.font.body};
    font-size: 15px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, p, figure {
    margin: 0;
  }

  button {
    font: inherit;
    color: inherit;
    touch-action: manipulation;
  }

  a {
    touch-action: manipulation;
  }

  /* A single visible focus ring everywhere, since the board is fully keyboard
     operable and the default outline disappears against these surfaces. */
  :focus-visible {
    outline: 2px solid ${theme.color.accent};
    outline-offset: 2px;
    border-radius: ${theme.radius.sm};
  }

  /* Stops the page behind an open dialog from scrolling. */
  body[data-dialog-open="true"] {
    overflow: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
