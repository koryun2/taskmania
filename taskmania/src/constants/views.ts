export type View = "board" | "archive";

interface ViewConfig {
  id: View;
  label: string;
}

export const VIEWS: readonly ViewConfig[] = [
  { id: "board", label: "Board" },
  { id: "archive", label: "Archive" },
] as const;

export function viewFromHash(hash: string): View {
  return hash === "#archive" ? "archive" : "board";
}

export function hashForView(view: View): string {
  return view === "archive" ? "#archive" : "#board";
}

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
