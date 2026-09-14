const absolute = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** A short calendar date for the board, e.g. "15 Sep 2026". */
export function formatWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  return absolute.format(then);
}

/** A full timestamp for the `title` attribute. */
export function formatExact(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  return then.toLocaleString();
}
