import type { ReactNode } from "react";
import { Body, Close, Wrap } from "./Banner.styles";
import { Button } from "../../styles/ui";

export type BannerTone = "error" | "success";

interface BannerProps {
  tone: BannerTone;
  children: ReactNode;
  onDismiss?: () => void;
  /** Optional inline action, used for "Try again" on a failed load. */
  action?: { label: string; onClick: () => void };
}

export function Banner({ tone, children, onDismiss, action }: BannerProps) {
  return (
    <Wrap
      $tone={tone}
      // Errors interrupt; confirmations wait for a pause in speech.
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <Body>{children}</Body>

      {action ? (
        <Button type="button" $size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}

      {onDismiss ? (
        <Close type="button" onClick={onDismiss} aria-label="Dismiss message">
          &times;
        </Close>
      ) : null}
    </Wrap>
  );
}
