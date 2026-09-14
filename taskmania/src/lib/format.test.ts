import { describe, expect, it } from "vitest";
import { formatWhen } from "./format";

describe("formatWhen", () => {
  it("formats as a plain date", () => {
    const result = formatWhen("2026-05-20T12:00:00Z");

    expect(result).not.toMatch(/ago|yesterday|just now/);
    expect(result).toMatch(/2026/);
  });

  it("returns an empty string for a value it cannot parse", () => {
    expect(formatWhen("not a date")).toBe("");
  });
});
