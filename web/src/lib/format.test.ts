import { describe, expect, it } from "vitest";
import { formatWhen } from "./format";

const now = new Date("2026-05-20T12:00:00Z");

function ago(ms: number): string {
  return new Date(now.getTime() - ms).toISOString();
}

describe("formatWhen", () => {
  it("uses relative wording while the change is recent", () => {
    expect(formatWhen(ago(30_000), now)).toBe("just now");
    expect(formatWhen(ago(5 * 60_000), now)).toBe("5 min ago");
    expect(formatWhen(ago(3 * 3_600_000), now)).toBe("3 h ago");
    expect(formatWhen(ago(2 * 86_400_000), now)).toBe("2 d ago");
  });

  it("switches to a date once relative wording stops being useful", () => {
    const result = formatWhen(ago(30 * 86_400_000), now);

    expect(result).not.toMatch(/ago/);
    expect(result).toMatch(/2026/);
  });

  it("returns an empty string for a value it cannot parse", () => {
    expect(formatWhen("not a date", now)).toBe("");
  });
});
