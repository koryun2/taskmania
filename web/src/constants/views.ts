export type View = "board" | "archive";

export interface ViewConfig {
  id: View;
  label: string;
}

export const VIEWS: readonly ViewConfig[] = [
  { id: "board", label: "Board" },
  { id: "archive", label: "Archive" },
] as const;

/** Copy shown when a list has nothing in it, so each empty state reads right. */
export const EMPTY_COPY: Record<View, { title: string; body: string }> = {
  board: {
    title: "Nothing on the board",
    body: "Add your first task to get started.",
  },
  archive: {
    title: "The archive is empty",
    body: "Tasks you archive from the board will show up here.",
  },
};
