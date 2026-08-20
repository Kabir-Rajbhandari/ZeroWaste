import { describe, it, expect, beforeEach } from "vitest";
import {
  getStoredUser,
  setStoredUser,
  getStoredToken,
  isLoggedIn,
  getUserEmailCookie,
  setUserEmailCookie,
  clearAuth,
} from "../auth.js";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name)
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
});

describe("getStoredUser / setStoredUser", () => {
  it("returns null when nothing is stored", () => {
    expect(getStoredUser()).toBeNull();
  });

  it("round-trips a user object through localStorage", () => {
    localStorage.setItem("zw_user", JSON.stringify({ id: "u1", name: "Test" }));
    expect(getStoredUser()).toEqual({ id: "u1", name: "Test" });
  });

  it("returns null (not throw) for malformed stored JSON", () => {
    localStorage.setItem("zw_user", "{not-json");
    expect(getStoredUser()).toBeNull();
  });

  it("updates whichever storage already holds the user (localStorage)", () => {
    localStorage.setItem("zw_user", JSON.stringify({ id: "old" }));
    setStoredUser({ id: "new" });
    expect(JSON.parse(localStorage.getItem("zw_user"))).toEqual({ id: "new" });
  });

  it("updates sessionStorage when that's where the user currently lives", () => {
    sessionStorage.setItem("zw_user", JSON.stringify({ id: "old" }));
    setStoredUser({ id: "new" });
    expect(JSON.parse(sessionStorage.getItem("zw_user"))).toEqual({
      id: "new",
    });
    expect(localStorage.getItem("zw_user")).toBeNull();
  });
});

describe("isLoggedIn", () => {
  it("is false with no token/user present", () => {
    expect(isLoggedIn()).toBe(false);
  });

  it("is true once both a token and a user are stored", () => {
    localStorage.setItem("zw_token", "abc123");
    localStorage.setItem("zw_user", JSON.stringify({ id: "u1" }));
    expect(isLoggedIn()).toBe(true);
  });

  it("is false with a token but no user (partial/corrupt session)", () => {
    localStorage.setItem("zw_token", "abc123");
    expect(isLoggedIn()).toBe(false);
  });
});

describe("getStoredToken", () => {
  it("reads from localStorage first, falling back to sessionStorage", () => {
    sessionStorage.setItem("zw_token", "session-token");
    expect(getStoredToken()).toBe("session-token");

    localStorage.setItem("zw_token", "local-token");
    expect(getStoredToken()).toBe("local-token");
  });
});

describe("user email cookie", () => {
  it("round-trips an email through the cookie helpers", () => {
    setUserEmailCookie("qa@example.com");
    expect(getUserEmailCookie()).toBe("qa@example.com");
  });

  it("does nothing when given a falsy email", () => {
    setUserEmailCookie("");
    expect(getUserEmailCookie()).toBe("");
  });
});

describe("clearAuth", () => {
  it("removes token/user from both storages and the email cookie", async () => {
    localStorage.setItem("zw_token", "t");
    localStorage.setItem("zw_user", JSON.stringify({ id: "u1" }));
    sessionStorage.setItem("zw_token", "t2");
    setUserEmailCookie("qa@example.com");

    clearAuth();

    expect(localStorage.getItem("zw_token")).toBeNull();
    expect(localStorage.getItem("zw_user")).toBeNull();
    expect(sessionStorage.getItem("zw_token")).toBeNull();
    expect(getUserEmailCookie()).toBe("");
  });
});
