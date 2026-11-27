import { describe, expect, it } from "vitest";
import { HOLD_MS, liveHolds, withHold, type Hold } from "./discount-holds";

const now = Date.parse("2026-11-27T10:00:00Z");
const hold = (key: string, minutesAgo: number): Hold => ({ _key: key, key, at: new Date(now - minutesAgo * 60_000).toISOString() });

describe("withHold", () => {
  it("gives a place while uses and other holds are under the limit", () => {
    expect(withHold({ uses: 0, maxUses: 1 }, "a", now)).toEqual([hold("a", 0)]);
    expect(withHold({ uses: 3, maxUses: 5, holds: [hold("b", 5)] }, "a", now)).toEqual([hold("b", 5), hold("a", 0)]);
  });

  it("refuses the checkout that would take the code past its limit", () => {
    // One use left, and another checkout is holding it.
    expect(withHold({ uses: 4, maxUses: 5, holds: [hold("b", 5)] }, "a", now)).toBeNull();
    // Nothing left at all.
    expect(withHold({ uses: 5, maxUses: 5 }, "a", now)).toBeNull();
  });

  it("lets a checkout keep and renew the place it already has", () => {
    expect(withHold({ uses: 4, maxUses: 5, holds: [hold("a", 20)] }, "a", now)).toEqual([hold("a", 0)]);
    // Even when the code has since been filled by others: the place was promised.
    expect(withHold({ uses: 5, maxUses: 5, holds: [hold("a", 20)] }, "a", now)).toEqual([hold("a", 0)]);
  });

  it("frees a place when a hold has lapsed", () => {
    const stale = hold("b", HOLD_MS / 60_000 + 1);
    expect(liveHolds([stale], now)).toEqual([]);
    expect(withHold({ uses: 4, maxUses: 5, holds: [stale] }, "a", now)).toEqual([hold("a", 0)]);
  });

  it("never refuses a code without a limit, and still tidies its holds", () => {
    expect(withHold({ uses: 900 }, "a", now)).toEqual([hold("a", 0)]);
    expect(withHold({ uses: 900, maxUses: null, holds: [hold("b", 999)] }, "a", now)).toEqual([hold("a", 0)]);
  });
});
