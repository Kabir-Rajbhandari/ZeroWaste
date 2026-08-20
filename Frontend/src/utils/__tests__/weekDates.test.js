import { describe, it, expect } from "vitest";
import { getWeekStart, addDays, dayKey } from "../weekDates.js";

describe("getWeekStart", () => {
  it("returns the same Monday when given a Monday", () => {
    const monday = new Date("2026-08-17T15:30:00"); // a Monday
    const result = getWeekStart(monday);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(17);
  });

  it("rolls back to Monday when given a mid-week date", () => {
    const wednesday = new Date("2026-08-19T09:00:00");
    const result = getWeekStart(wednesday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(17);
  });

  it("rolls back to the previous Monday when given a Sunday", () => {
    // getDay() === 0 branch — the trickiest edge case in the implementation.
    const sunday = new Date("2026-08-23T12:00:00");
    const result = getWeekStart(sunday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(17);
  });

  it("zeroes out the time portion", () => {
    const result = getWeekStart(new Date("2026-08-19T23:59:59"));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe("addDays", () => {
  it("adds positive days without mutating the input date", () => {
    const start = new Date("2026-08-17T00:00:00");
    const result = addDays(start, 3);
    expect(result.getDate()).toBe(20);
    expect(start.getDate()).toBe(17); // original untouched
  });

  it("supports negative offsets", () => {
    const start = new Date("2026-08-17T00:00:00");
    const result = addDays(start, -2);
    expect(result.getDate()).toBe(15);
  });

  it("rolls over into the next month correctly", () => {
    const start = new Date("2026-08-30T00:00:00");
    const result = addDays(start, 3);
    expect(result.getMonth()).toBe(8); // September (0-indexed)
    expect(result.getDate()).toBe(2);
  });
});

describe("dayKey", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    expect(dayKey(new Date("2026-01-05T23:00:00"))).toBe("2026-01-05");
  });

  it("zero-pads single-digit months and days", () => {
    expect(dayKey(new Date("2026-03-04T00:00:00"))).toBe("2026-03-04");
  });

  it("produces a key consistent with getWeekStart + addDays for a full week", () => {
    const start = getWeekStart(new Date("2026-08-19T00:00:00"));
    const keys = Array.from({ length: 7 }, (_, i) => dayKey(addDays(start, i)));
    expect(keys).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
      "2026-08-23",
    ]);
  });
});
