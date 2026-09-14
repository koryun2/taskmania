/** Design tokens. Every component reads from here so the palette stays in one place. */
export const theme = {
  color: {
    canvas: "#f6f7fb",
    surface: "#ffffff",
    surfaceMuted: "#f2f4f9",
    border: "#e2e6ef",
    borderStrong: "#cbd2e1",

    text: "#1b2233",
    textMuted: "#5d6780",
    textFaint: "#8b94a9",

    accent: "#4f46e5",
    accentHover: "#4338ca",
    accentSoft: "#eef0fe",

    danger: "#c0342c",
    dangerSoft: "#fdecea",
    success: "#1d7a4c",
    successSoft: "#e7f6ee",
    warning: "#9a6210",
    warningSoft: "#fdf2df",
  },

  /** One colour pair per importance level, used by the card badges. */
  importance: {
    low: { fg: "#4a5568", bg: "#edf0f5" },
    medium: { fg: "#9a6210", bg: "#fdf2df" },
    high: { fg: "#c0342c", bg: "#fdecea" },
  },

  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    pill: "999px",
  },

  shadow: {
    card: "0 1px 2px rgba(19, 26, 46, 0.06)",
    raised: "0 4px 14px rgba(19, 26, 46, 0.1)",
    overlay: "0 18px 48px rgba(19, 26, 46, 0.22)",
  },

  space: (n: number) => `${n * 4}px`,

  font: {
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  /**
   * Layering is declared in one place so a raised element can never be
   * accidentally covered by something drawn later in the tree.
   */
  layer: {
    card: 1,
    menu: 30,
    overlay: 100,
  },
} as const;

export type Theme = typeof theme;
