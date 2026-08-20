import { describe, it, expect } from "vitest";
import {
  getActivityConfig,
  describeActivity,
  mapBackendActivity,
  mergeActivity,
  formatActivityTime,
} from "../activityDisplay.js";

describe("getActivityConfig", () => {
  it("returns the correct label for each known activity type", () => {
    expect(getActivityConfig("ADDED").label).toBe("Added");
    expect(getActivityConfig("USED").label).toBe("Used");
    expect(getActivityConfig("DONATED").label).toBe("Donated");
    expect(getActivityConfig("WASTED").label).toBe("Expired");
    expect(getActivityConfig("MEAL_PLANNED").label).toBe("Meal Planned");
    expect(getActivityConfig("LISTED_FOR_DONATION").label).toBe(
      "Listed for Donation",
    );
  });

  it("falls back to a generic config for an unknown type", () => {
    expect(getActivityConfig("SOMETHING_NEW").label).toBe("Activity");
  });
});

describe("describeActivity", () => {
  it("describes a simple ADDED entry using the item name", () => {
    expect(describeActivity({ type: "ADDED", itemName: "Apple" })).toBe(
      "Added Apple",
    );
  });

  it("falls back to category when itemName is missing", () => {
    expect(describeActivity({ type: "USED", category: "Dairy" })).toBe(
      "Used Dairy",
    );
  });

  it("falls back to 'an item' when neither itemName nor category is present", () => {
    expect(describeActivity({ type: "REMOVED" })).toBe("Removed an item");
  });

  it("uses a generic phrase for MEAL_PLANNED with no name", () => {
    expect(describeActivity({ type: "MEAL_PLANNED" })).toBe("Planned a meal");
  });

  it("names the meal for MEAL_PLANNED when itemName is present", () => {
    expect(
      describeActivity({ type: "MEAL_PLANNED", itemName: "Stir Fry" }),
    ).toBe("Planned meal: Stir Fry");
  });

  it("falls back to the raw title for an unrecognised type", () => {
    expect(
      describeActivity({ type: "MYSTERY", title: "Something happened" }),
    ).toBe("Something happened");
  });
});

describe("mapBackendActivity", () => {
  it("normalises a list of raw backend rows", () => {
    const raw = [
      {
        id: 1,
        type: "ADDED",
        category: "Fruits",
        itemName: "Apple",
        quantity: 3,
        occurredAt: "2026-08-01T10:00:00Z",
      },
    ];
    const [mapped] = mapBackendActivity(raw);

    expect(mapped.id).toBe("backend-1");
    expect(mapped.title).toBe("Added Apple");
    expect(mapped.quantity).toBe(3);
    expect(mapped.timestamp).toBe("2026-08-01T10:00:00Z");
  });

  it("returns an empty array when given non-array input", () => {
    expect(mapBackendActivity(null)).toEqual([]);
    expect(mapBackendActivity(undefined)).toEqual([]);
  });

  it("defaults missing quantity to null rather than 0", () => {
    const [mapped] = mapBackendActivity([{ type: "USED" }]);
    expect(mapped.quantity).toBeNull();
  });
});

describe("mergeActivity", () => {
  it("sorts entries newest-first", () => {
    const entries = [
      { id: "a", timestamp: "2026-08-01T00:00:00Z" },
      { id: "b", timestamp: "2026-08-03T00:00:00Z" },
      { id: "c", timestamp: "2026-08-02T00:00:00Z" },
    ];
    const merged = mergeActivity(entries);
    expect(merged.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("respects the limit argument", () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      timestamp: new Date(2026, 0, i + 1).toISOString(),
    }));
    expect(mergeActivity(entries, 2)).toHaveLength(2);
  });
});

describe("formatActivityTime", () => {
  it("returns 'Just now' for a falsy timestamp", () => {
    expect(formatActivityTime(null)).toBe("Just now");
    expect(formatActivityTime(undefined)).toBe("Just now");
  });

  it("returns 'Just now' for an unparsable timestamp", () => {
    expect(formatActivityTime("not-a-date")).toBe("Just now");
  });

  it("formats a valid ISO timestamp without throwing", () => {
    const result = formatActivityTime("2026-08-01T10:30:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
