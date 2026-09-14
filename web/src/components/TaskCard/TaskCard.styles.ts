import styled from "styled-components";
import { theme } from "../../styles/theme";

export const Wrap = styled.article<{ $busy: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${theme.space(2.5)};
  padding: ${theme.space(4)};
  border: 1px solid ${theme.color.border};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surface};
  box-shadow: ${theme.shadow.card};
  transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;

  /* Dimmed while a request is in flight, so the card that is saving is
     obvious without blocking the rest of the board. */
  opacity: ${(p) => (p.$busy ? 0.6 : 1)};

  &:hover {
    border-color: ${theme.color.borderStrong};
    box-shadow: ${theme.shadow.raised};
  }

  /* The click target is invisible, so the ring has to be drawn on the card. */
  &:has(> button:focus-visible) {
    outline: 2px solid ${theme.color.accent};
    outline-offset: 2px;
  }
`;

/** Covers the card to make the whole surface open the detail dialog. */
export const OpenTarget = styled.button`
  position: absolute;
  inset: 0;
  z-index: ${theme.layer.card};
  width: 100%;
  border: none;
  border-radius: ${theme.radius.md};
  background: transparent;
  cursor: pointer;

  &:focus-visible {
    outline: none;
  }
`;

export const Head = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.space(2)};
`;

export const Title = styled.h3`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
`;

export const Description = styled.p`
  color: ${theme.color.textMuted};
  font-size: 13.5px;
  line-height: 1.5;
  overflow-wrap: anywhere;

  /* Two lines is enough to recognise a task; the rest is in the dialog. */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.space(2)};
  margin-top: ${theme.space(0.5)};
`;

/**
 * Lifts the real controls above the overlay button so they receive their own
 * clicks instead of opening the dialog.
 */
export const Actions = styled.div`
  position: relative;
  z-index: ${theme.layer.card + 1};
  display: flex;
  align-items: center;
  gap: ${theme.space(1)};
`;
