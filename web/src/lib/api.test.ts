import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api";

function respond(status: number, body: unknown, init: ResponseInit = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("query building", () => {
  it("sends only the filters that were set", async () => {
    fetchMock.mockResolvedValue(respond(200, { items: [], page: 1, limit: 20, total: 0 }));

    await api.listTasks({ archived: true, page: 2, limit: 10 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(url).toContain("archived=true");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
    // `open` was not requested, so it must not appear at all: an empty value
    // would read as a deliberate filter on the server.
    expect(url).not.toContain("open");
  });
});

describe("error handling", () => {
  it("carries the server's per-field messages", async () => {
    fetchMock.mockResolvedValue(
      respond(422, { error: { code: "validation_failed", message: "Some fields need attention.", fields: { title: "Title is required." } } }),
    );

    await expect(api.createTask({ title: "" })).rejects.toMatchObject({
      status: 422,
      code: "validation_failed",
      fields: { title: "Title is required." },
    });
  });

  it("flags a version conflict so callers can refresh", async () => {
    fetchMock.mockResolvedValue(respond(409, { error: { code: "version_conflict", message: "Changed elsewhere." } }));

    const error = await api.updateTask("id", { version: 1 }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isConflict).toBe(true);
  });

  it("reports a readable message when the request never completes", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const error = await api.listTasks().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("network_error");
  });

  it("falls back to a generic message when the body is not the expected shape", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 502 }));

    const error = await api.listTasks().catch((e: unknown) => e);

    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).message).toMatch(/something went wrong/i);
  });
});

describe("responses", () => {
  it("handles the empty body returned by delete", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(api.deleteTask("id")).resolves.toBeUndefined();
  });

  it("sends JSON content type only when there is a body", async () => {
    fetchMock.mockResolvedValue(respond(200, { items: [], page: 1, limit: 20, total: 0 }));

    await api.listTasks();

    const [, init] = fetchMock.mock.calls[0]!;
    expect((init as RequestInit | undefined)?.headers).toBeUndefined();
  });
});
