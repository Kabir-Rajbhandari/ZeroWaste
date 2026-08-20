import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  logActivity,
  getRecentActivity,
  clearActivityLog,
  onActivityLogged,
} from "../activitylog.js";

function setStoredUser(id) {
  localStorage.setItem("zw_user", JSON.stringify({ id }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("logActivity", () => {
  it("stores a new entry and returns it", () => {
    setStoredUser("user-1");
    const entry = logActivity("Added Apple");

    expect(entry.title).toBe("Added Apple");
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
  });

  it("scopes entries per logged-in user id", () => {
    setStoredUser("user-1");
    logActivity("Added Apple");

    setStoredUser("user-2");
    logActivity("Donated Bread");

    // user-2 should NOT see user-1's entry.
    const user2Entries = getRecentActivity();
    expect(user2Entries.map((e) => e.title)).toEqual(["Donated Bread"]);

    setStoredUser("user-1");
    const user1Entries = getRecentActivity();
    expect(user1Entries.map((e) => e.title)).toEqual(["Added Apple"]);
  });

  it("caps stored entries at 20, keeping the most recent first", () => {
    setStoredUser("user-1");
    for (let i = 0; i < 25; i += 1) {
      logActivity(`Activity ${i}`);
    }
    const stored = JSON.parse(
      localStorage.getItem("zerowaste_activity_log:user-1"),
    );
    expect(stored).toHaveLength(20);
    expect(stored[0].title).toBe("Activity 24"); // most recent first
  });

  it("dispatches a zerowaste:activity-logged event", () => {
    setStoredUser("user-1");
    const handler = vi.fn();
    const unsubscribe = onActivityLogged(handler);

    logActivity("Used Milk");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].title).toBe("Used Milk");
    unsubscribe();
  });
});

describe("getRecentActivity", () => {
  it("returns entries with a human-readable 'time' field", () => {
    setStoredUser("user-1");
    logActivity("Added Bread");
    const [entry] = getRecentActivity();
    expect(entry.time).toBeTruthy();
  });

  it("respects the limit argument", () => {
    setStoredUser("user-1");
    for (let i = 0; i < 6; i += 1) logActivity(`Item ${i}`);
    expect(getRecentActivity(3)).toHaveLength(3);
  });

  it("returns an empty array for a user with no logged activity", () => {
    setStoredUser("brand-new-user");
    expect(getRecentActivity()).toEqual([]);
  });
});

describe("clearActivityLog", () => {
  it("wipes only the current user's entries", () => {
    setStoredUser("user-1");
    logActivity("Added Apple");
    clearActivityLog();
    expect(getRecentActivity()).toEqual([]);
  });
});
