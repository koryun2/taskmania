import { useEffect, useRef } from "react";
import { focusableWithin } from "../lib/focus";

/**
 * Makes a dialog behave like a modal for keyboard and screen reader users:
 * focus moves in on open, Tab cycles inside it, Escape closes it, and focus
 * returns to whatever opened it.
 *
 * Without the trap, Tab walks into the page behind the overlay, where the
 * content is visually covered but still reachable.
 */
export function useDialogFocus(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

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
        onClose();
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

      // Wrap at whichever end we are about to fall off.
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
  }, [onClose]);

  return ref;
}
