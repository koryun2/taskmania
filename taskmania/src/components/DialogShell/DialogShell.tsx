import { useId } from "react";
import type { ReactNode } from "react";
import { Body, Footer, Head, Overlay, Panel, Title } from "./DialogShell.styles";
import { IconButton } from "../../styles/ui";
import { useDialogFocus } from "../../hooks/useDialogFocus";

interface DialogShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * The frame every dialog shares: overlay, panel, heading, and close button.
 *
 * Focus handling lives in useDialogFocus so both dialogs behave identically
 * without either of them reimplementing a trap.
 */
export function DialogShell({ title, onClose, children, footer }: DialogShellProps) {
  const titleId = useId();
  const panelRef = useDialogFocus(onClose);

  return (
    <Overlay
      // Clicking the backdrop dismisses, but a click that started inside the
      // panel and drifted out should not, hence the target check.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Panel ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <Head>
          <Title id={titleId}>{title}</Title>
          <IconButton type="button" onClick={onClose} aria-label="Close dialog">
            &times;
          </IconButton>
        </Head>

        <Body>{children}</Body>

        {footer ? <Footer>{footer}</Footer> : null}
      </Panel>
    </Overlay>
  );
}
