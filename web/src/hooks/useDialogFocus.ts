import { useEffect, useRef } from "react";
import { focusableWithin } from "../lib/focus";

/**
 * Makes a dialog behave like a modal for keyboard and screen reader users:
 * focus moves in on open, Tab cycles inside it, Escape closes it, and focus
 * returns to whatever opened it.
 *
 * onClose is read from a ref so the trap is not torn down and rebuilt whenever
 * the parent passes a new callback (see vercel-react-best-practices:
 * store event handlers in refs).
 */
export function useDialogFocus(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const opener = document.activeElement as HTMLElement | null;

    // Prefer the first field over the close button, so opening a form puts the
    // caret where the user is about to type.
    const [first] = focusableWithin(dialog);
    (first ?? dialog).focus();

    document.body.dataset.dialogOpen = "true";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const targets = focusableWithin(dialog);
      if (targets.length === 0) {
        event.preventDefault();
        return;
      }

      const first = targets[0]!;
      const last = targets[targets.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      delete document.body.dataset.dialogOpen;
      opener?.focus?.();
    };
  }, []);

  return ref;
}
