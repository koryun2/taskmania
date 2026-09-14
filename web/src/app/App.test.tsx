import { render, screen, waitFor, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ApiError, api } from "../lib/api";
import { makePage, makeTask } from "../test/factory";
import type { Task } from "../lib/types";

// The API module is the seam: mocking it exercises the real components,
// hooks, and state transitions without a server.
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    api: {
      listTasks: vi.fn(),
      createTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
    },
  };
});

const mocked = vi.mocked(api);

function givenTasks(...tasks: Task[]) {
  mocked.listTasks.mockResolvedValue(makePage(tasks));
}

/** Waits for the initial load so assertions do not race the skeleton. */
async function renderApp() {
  render(<App />);
  await waitForElementToBeRemoved(() => screen.queryByText("Loading tasks"));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "http://localhost:3000/#board");
  givenTasks();
});

describe("board", () => {
  it("shows tasks in the column matching their status", async () => {
    givenTasks(
      makeTask({ title: "Plan the sprint", status: "todo" }),
      makeTask({ title: "Build the API", status: "in_progress" }),
      makeTask({ title: "Ship it", status: "done" }),
    );

    await renderApp();

    expect(screen.getByRole("heading", { name: /Plan the sprint/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Build the API/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Ship it/ })).toBeInTheDocument();
  });

  it("invites the user to add a task when the board is empty", async () => {
    await renderApp();

    expect(screen.getByText("Nothing on the board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a task" })).toBeInTheDocument();
  });

  it("offers only the next step for each status", async () => {
    givenTasks(
      makeTask({ title: "Not started", status: "todo" }),
      makeTask({ title: "Underway", status: "in_progress" }),
      makeTask({ title: "Finished", status: "done" }),
    );

    await renderApp();

    // One action per card: no "Complete" on a to-do, no "To do" on a card in
    // progress. Regressions here were the original reason for the rule.
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "To do" })).not.toBeInTheDocument();
  });

  it("moves a task forward and shows the result", async () => {
    const task = makeTask({ title: "Movable", status: "todo" });
    givenTasks(task);
    mocked.updateTask.mockResolvedValue({ ...task, status: "in_progress", version: 2 });

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(mocked.updateTask).toHaveBeenCalledWith(task.id, { status: "in_progress", version: 1 });
    });
    expect(await screen.findByRole("button", { name: "Complete" })).toBeInTheDocument();
  });
});

describe("adding a task", () => {
  it("creates a task from the header button", async () => {
    const created = makeTask({ title: "Written in the dialog" });
    mocked.createTask.mockResolvedValue(created);

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "New task" }));

    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Title"), "Written in the dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add task" }));

    await waitFor(() => {
      expect(mocked.createTask).toHaveBeenCalledWith({
        title: "Written in the dialog",
        description: "",
        status: "todo",
        importance: "medium",
      });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the same dialog from the plus button in the To do column", async () => {
    givenTasks(makeTask({ title: "Something", status: "todo" }));

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Add a to-do" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "New task" })).toBeInTheDocument();
  });

  it("refuses an empty title without calling the server", async () => {
    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "New task" }));

    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add task" }));

    expect(await within(dialog).findByText("Title is required.")).toBeInTheDocument();
    expect(mocked.createTask).not.toHaveBeenCalled();
  });

  it("shows a server validation message on the field it belongs to", async () => {
    mocked.createTask.mockRejectedValue(
      new ApiError(422, "validation_failed", "Some fields need attention.", {
        title: "Title must be 200 characters or fewer.",
      }),
    );

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "New task" }));

    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Title"), "Too long");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add task" }));

    // The dialog stays open so the user can fix the input in place.
    expect(await within(dialog).findByText("Title must be 200 characters or fewer.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("task details", () => {
  it("opens when the card is clicked", async () => {
    givenTasks(makeTask({ title: "Clickable" }));

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Open details for Clickable" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Task details" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Clickable");
  });

  it("does not open when a control on the card is used", async () => {
    const task = makeTask({ title: "Has buttons", status: "todo" });
    givenTasks(task);
    mocked.updateTask.mockResolvedValue({ ...task, status: "in_progress", version: 2 });

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));

    // The status button sits above the card-wide click target, so using it
    // must not also open the dialog.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sends only the version it was opened with", async () => {
    const task = makeTask({ title: "Editable", version: 7 });
    givenTasks(task);
    mocked.updateTask.mockResolvedValue({ ...task, title: "Edited", version: 8 });

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Open details for Editable" }));

    const dialog = screen.getByRole("dialog");
    const title = within(dialog).getByLabelText("Title");
    await userEvent.clear(title);
    await userEvent.type(title, "Edited");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(mocked.updateTask).toHaveBeenCalledWith(
        task.id,
        expect.objectContaining({ title: "Edited", version: 7 }),
      );
    });
  });

  it("keeps save disabled until something changes", async () => {
    givenTasks(makeTask({ title: "Untouched" }));

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Open details for Untouched" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("closes on Escape", async () => {
    givenTasks(makeTask({ title: "Escapable" }));

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Open details for Escapable" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("concurrent edits", () => {
  it("explains a version conflict and reloads the board", async () => {
    const task = makeTask({ title: "Contested", status: "todo" });
    givenTasks(task);
    mocked.updateTask.mockRejectedValue(
      new ApiError(409, "version_conflict", "This task changed somewhere else. Refresh to get the latest version."),
    );

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("This task changed somewhere else.");
    // A conflict means our copy is stale, so the list is refetched.
    await waitFor(() => expect(mocked.listTasks).toHaveBeenCalledTimes(2));
  });

  it("leaves the board on screen when a write fails", async () => {
    const task = makeTask({ title: "Still here", status: "todo" });
    givenTasks(task);
    mocked.updateTask.mockRejectedValue(new ApiError(500, "internal_error", "Something went wrong on our side."));

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Still here/ })).toBeInTheDocument();
  });
});

describe("archive", () => {
  it("archives from the card menu and confirms it", async () => {
    const task = makeTask({ title: "Filed away" });
    givenTasks(task);
    mocked.updateTask.mockResolvedValue({ ...task, archived: true, version: 2 });

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Actions for Filed away" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Archive" }));

    await waitFor(() => {
      expect(mocked.updateTask).toHaveBeenCalledWith(task.id, { archived: true, version: 1 });
    });
    expect(await screen.findByText("Archived “Filed away”.")).toBeInTheDocument();
  });

  it("requests archived tasks when the archive view is opened", async () => {
    await renderApp();
    await userEvent.click(screen.getByRole("link", { name: "Archive" }));

    await waitFor(() => {
      expect(mocked.listTasks).toHaveBeenLastCalledWith(
        expect.objectContaining({ archived: true }),
        expect.anything(),
      );
    });
    expect(await screen.findByText("The archive is empty")).toBeInTheDocument();
  });

  it("asks before deleting a task", async () => {
    const task = makeTask({ title: "Throwaway" });
    givenTasks(task);
    mocked.deleteTask.mockResolvedValue(undefined);

    await renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Actions for Throwaway" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(mocked.deleteTask).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Delete this task?" })).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));

    await waitFor(() => {
      expect(mocked.deleteTask).toHaveBeenCalledWith(task.id);
    });
  });

  it("marks the current view for assistive technology", async () => {
    await renderApp();

    expect(screen.getByRole("link", { name: "Board" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Archive" })).not.toHaveAttribute("aria-current");
  });
});

describe("loading failures", () => {
  it("offers a retry when the list cannot load", async () => {
    mocked.listTasks.mockRejectedValueOnce(new ApiError(0, "network_error", "Cannot reach the server."));

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Cannot reach the server.");

    givenTasks(makeTask({ title: "Back online" }));
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: /Back online/ })).toBeInTheDocument();
  });
});
