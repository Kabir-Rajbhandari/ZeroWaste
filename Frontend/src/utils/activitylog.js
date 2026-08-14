import { getStoredUser } from "./auth";

const STORAGE_PREFIX = "zerowaste_activity_log";
const MAX_ENTRIES = 20;

/**
 * Activity entries are scoped per logged-in user id, not to a single global
 * key. Without this, everyone sharing a browser/device would see each
 * other's "Added Milk" / "Donated Bread" entries in their own dashboard,
 * since a plain localStorage key persists across logins. Falls back to an
 * "anonymous" bucket only if somehow called with nobody logged in.
 */
function getStorageKey() {
  const user = getStoredUser();
  const userId = user?.id ?? "anonymous";
  return `${STORAGE_PREFIX}:${userId}`;
}

function readLog() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entries) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(entries));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently
  }
}

/**
 * Record an activity entry. Call this right after a successful
 * add / use / donate / delete action.
 *
 * @param {string} title - e.g. "Added Milk", "Donated Orange"
 */
export function logActivity(title) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    timestamp: new Date().toISOString(),
  };
  const entries = [entry, ...readLog()].slice(0, MAX_ENTRIES);
  writeLog(entries);
  window.dispatchEvent(
    new CustomEvent("zerowaste:activity-logged", { detail: entry }),
  );
  return entry;
}

/**
 * Subscribe to new activity as it's logged (e.g. from the Dashboard, so it
 * updates immediately instead of waiting for the next full data reload).
 * Returns an unsubscribe function.
 */
export function onActivityLogged(callback) {
  const handler = (e) => callback(e.detail);
  window.addEventListener("zerowaste:activity-logged", handler);
  return () => window.removeEventListener("zerowaste:activity-logged", handler);
}

/**
 * Get the most recent activity entries, newest first, with a
 * display-ready `time` string (e.g. "Today, 04:45 PM").
 */
export function getRecentActivity(limit = 4) {
  return readLog()
    .slice(0, limit)
    .map((entry) => ({ ...entry, time: formatActivityTime(entry.timestamp) }));
}

/**
 * Wipes the *current* user's locally-cached activity entries. Call this on
 * logout so nothing lingers in localStorage for the next person who logs
 * into this browser to accidentally see (belt-and-braces on top of the
 * per-user storage key above).
 */
export function clearActivityLog() {
  try {
    localStorage.removeItem(getStorageKey());
  } catch {
    // ignore
  }
}

export function formatActivityTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isSameDay = (a, b) => a.toDateString() === b.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, yesterday)) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${time}`;
}
