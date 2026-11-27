import { describe, expect, it } from "vitest";
import { decide, LIMITS, recent } from "./rate-limit-rules";

const limit = { max: 3, windowMs: 60_000 };
const now = 1_000_000;

describe("decide", () => {
  it("lets a first attempt through and counts it", () => {
    expect(decide(undefined, now, limit)).toEqual({ ok: true, sent: [now] });
  });

  it("lets attempts through up to the limit and refuses the next", () => {
    expect(decide([now - 3000, now - 2000], now, limit)).toEqual({ ok: true, sent: [now - 3000, now - 2000, now] });
    expect(decide([now - 3000, now - 2000, now - 1000], now, limit)).toEqual({ ok: false, sent: [now - 3000, now - 2000, now - 1000] });
  });

  it("does not count a refused attempt, so the visitor is let back in when the window moves on", () => {
    const full = [now - 59_000, now - 2000, now - 1000];
    expect(decide(full, now, limit).ok).toBe(false);
    // Two seconds later the oldest attempt is outside the window.
    expect(decide(full, now + 2000, limit).ok).toBe(true);
  });

  it("forgets attempts older than the window", () => {
    expect(decide([now - 61_000, now - 60_000, now - 100], now, limit)).toEqual({ ok: true, sent: [now - 100, now] });
  });

  it("ignores junk and moments in the future", () => {
    expect(recent([now + 5000, Number.NaN, now - 10] as number[], now, limit)).toEqual([now - 10]);
  });
});

describe("LIMITS", () => {
  it("are all positive and none tighter than a person could meet by accident", () => {
    for (const l of Object.values(LIMITS)) {
      expect(l.max).toBeGreaterThanOrEqual(20);
      expect(l.windowMs).toBeGreaterThan(0);
    }
  });
});
