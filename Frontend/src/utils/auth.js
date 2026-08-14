function getCookie(name) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookie(name, value, days = 30) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const maxAge = `; Max-Age=${days * 24 * 60 * 60}`;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${secure}${maxAge}`;
}

function eraseCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getStoredUser() {
  const raw =
    localStorage.getItem("zw_user") || sessionStorage.getItem("zw_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Updates whichever storage (local/session) currently holds the user,
// so the header and other components pick up profile changes right away.
export function setStoredUser(user) {
  const json = JSON.stringify(user);
  if (localStorage.getItem("zw_user")) {
    localStorage.setItem("zw_user", json);
  } else if (sessionStorage.getItem("zw_user")) {
    sessionStorage.setItem("zw_user", json);
  } else {
    sessionStorage.setItem("zw_user", json);
  }
}

export function getStoredToken() {
  return localStorage.getItem("zw_token") || sessionStorage.getItem("zw_token");
}

export function getUserEmailCookie() {
  return getCookie("zw_user_email");
}

export function setUserEmailCookie(email) {
  if (!email) return;
  setCookie("zw_user_email", email);
}

export function getDonationDetailsCookie() {
  const raw = getCookie("zw_recent_donation_details");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setDonationDetailsCookie(details) {
  if (!details) return;
  const payload = {
    location: details.location || "",
    availableTime: details.availableTime || "",
    contactDetail: details.contactDetail || "",
  };
  setCookie("zw_recent_donation_details", JSON.stringify(payload));
}

export function clearAuth() {
  // Clear this user's locally-cached activity feed *before* removing
  // zw_user, since it needs the current user id to find the right key.
  // (Dynamic import avoids a circular import between auth.js <-> activitylog.js.)
  import("./activitylog")
    .then((mod) => mod.clearActivityLog())
    .catch(() => {});

  localStorage.removeItem("zw_token");
  localStorage.removeItem("zw_user");
  sessionStorage.removeItem("zw_token");
  sessionStorage.removeItem("zw_user");
  eraseCookie("zw_user_email");
  eraseCookie("zw_recent_donation_details");
}

export function isLoggedIn() {
  return Boolean(getStoredToken() && getStoredUser());
}
