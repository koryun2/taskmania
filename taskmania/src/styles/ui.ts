import styled, { css } from "styled-components";
import { theme } from "./theme";

export const Page = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

export const Container = styled.div`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 ${theme.space(6)};
`;

export const Stack = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => theme.space(p.$gap ?? 4)};
`;

export const Row = styled.div<{ $gap?: number }>`
  display: flex;
  align-items: center;
  gap: ${(p) => theme.space(p.$gap ?? 2)};
`;

export const Spacer = styled.div`
  flex: 1;
`;

type ButtonTone = "primary" | "neutral" | "danger";

const tones: Record<ButtonTone, ReturnType<typeof css>> = {
  primary: css`
    background: ${theme.color.accent};
    border-color: ${theme.color.accent};
    color: #fff;

    &:hover:not(:disabled) {
      background: ${theme.color.accentHover};
      border-color: ${theme.color.accentHover};
    }
  `,
  neutral: css`
    background: ${theme.color.surface};
    border-color: ${theme.color.borderStrong};
    color: ${theme.color.text};

    &:hover:not(:disabled) {
      background: ${theme.color.surfaceMuted};
    }
  `,
  danger: css`
    background: ${theme.color.surface};
    border-color: ${theme.color.borderStrong};
    color: ${theme.color.danger};

    &:hover:not(:disabled) {
      background: ${theme.color.dangerSoft};
      border-color: ${theme.color.danger};
    }
  `,
};

export const Button = styled.button<{ $tone?: ButtonTone; $size?: "sm" | "md" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.space(1.5)};
  border: 1px solid transparent;
  border-radius: ${theme.radius.md};
  cursor: pointer;
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;

  ${(p) =>
    p.$size === "sm"
      ? css`
          padding: ${theme.space(1)} ${theme.space(2.5)};
          font-size: 13px;
        `
      : css`
          padding: ${theme.space(2)} ${theme.space(4)};
          font-size: 14px;
        `}

  ${(p) => tones[p.$tone ?? "neutral"]}

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: ${theme.radius.sm};
  background: transparent;
  color: ${theme.color.textMuted};
  cursor: pointer;
  line-height: 1;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover:not(:disabled) {
    background: ${theme.color.surfaceMuted};
    color: ${theme.color.text};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const Badge = styled.span<{ $fg: string; $bg: string }>`
  display: inline-flex;
  align-items: center;
  padding: 2px ${theme.space(2)};
  border-radius: ${theme.radius.pill};
  background: ${(p) => p.$bg};
  color: ${(p) => p.$fg};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
`;

export const Faint = styled.span`
  color: ${theme.color.textFaint};
  font-size: 12px;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: ${theme.space(1.5)};
  font-size: 13px;
  font-weight: 600;
  color: ${theme.color.text};
`;

const field = css`
  width: 100%;
  padding: ${theme.space(2.5)} ${theme.space(3)};
  border: 1px solid ${theme.color.borderStrong};
  border-radius: ${theme.radius.md};
  background: ${theme.color.surface};
  color: ${theme.color.text};
  font: inherit;
  font-size: 14px;

  &::placeholder {
    color: ${theme.color.textFaint};
  }

  &[aria-invalid="true"] {
    border-color: ${theme.color.danger};
  }
`;

export const Input = styled.input`
  ${field}
`;

export const Textarea = styled.textarea`
  ${field}
  min-height: 96px;
  resize: vertical;
`;

export const Select = styled.select`
  ${field}
  appearance: auto;
`;

export const FieldError = styled.p`
  margin-top: ${theme.space(1)};
  color: ${theme.color.danger};
  font-size: 13px;
`;

/** Visible to screen readers only; used for live regions and extra labels. */
export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;
