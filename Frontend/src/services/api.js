import { getStoredToken } from "../utils/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

function buildHeaders(extra = {}, isFormData = false) {
  const token = getStoredToken();
  return {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function parseError(response) {
  try {
    const data = await response.json();
    return data.message || data.error || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers, isFormData),
  });

  if (!response.ok) {
    const error = new Error(await parseError(response));
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;

  // Some endpoints (claim, accept, decline, mark-all-read, etc.) return 200
  // with an empty body rather than 204 — read as text first so we don't
  // crash trying to JSON-parse nothing.
  const text = await response.text();
  if (!text) return null;
  return JSON.parse(text);
}
export function resolveAssetUrl(assetPath) {
  if (!assetPath) return "";
  if (assetPath.startsWith("http://") || assetPath.startsWith("https://")) {
    return assetPath;
  }
  if (assetPath.startsWith("/")) {
    return `${API_BASE}${assetPath}`;
  }
  return assetPath;
}

export const foodApi = {
  getAll() {
    return request("/api/food-items", { method: "GET" });
  },

  create(item) {
    return request("/api/food-items", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  update(id, item) {
    return request(`/api/food-items/${id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
  },

  browse() {
    return request("/api/food-items/browse", { method: "GET" });
  },

  // Items moved into the Donation Listing via "Convert to Donation", not
  // yet finalized into a public donation.
  getDonationListing() {
    return request("/api/food-items/donation-listing", { method: "GET" });
  },

  // Step 1: move an item from the inventory into the Donation Listing.
  // Only allowed while the item is 1–7 days from expiring.
  listForDonation(id) {
    return request(`/api/food-items/${id}/list-for-donation`, {
      method: "POST",
    });
  },

  // Send an item back from the Donation Listing to the regular inventory.
  revertToInventory(id) {
    return request(`/api/food-items/${id}/revert-to-inventory`, {
      method: "POST",
    });
  },

  getRecentActivity(limit = 6) {
    return request(
      `/api/food-items/recent-activity?limit=${encodeURIComponent(limit)}`,
      { method: "GET" },
    );
  },

  donate(id, details) {
    return request(`/api/food-items/${id}/donate`, {
      method: "POST",
      body: details ? JSON.stringify(details) : undefined,
    });
  },

  claim(id) {
    return request(`/api/food-items/${id}/claim`, { method: "POST" });
  },

  markUsed(id) {
    return request(`/api/food-items/${id}/use`, { method: "POST" });
  },

  delete(id) {
    return request(`/api/food-items/${id}`, { method: "DELETE" });
  },
};
//
export const authApi = {
  login(email, password) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  verifyLoginOtp(email, code) {
    return request("/api/auth/login/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },

  resendVerification(email) {
    return request("/api/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  register(payload) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // UC1, step 2: Privacy & Security Configuration — its own step right
  // after registration, before the verification email goes out.
  configureSecurity({ email, donationPublic, enableTwoFactor }) {
    return request("/api/auth/configure-security", {
      method: "POST",
      body: JSON.stringify({ email, donationPublic, enableTwoFactor }),
    });
  },

  // UC1, step 3: read-only check fired the moment the confirmation link
  // loads — does not activate the account.
  checkVerificationToken(token) {
    return request(
      `/api/auth/verify-email/status?token=${encodeURIComponent(token)}`,
      { method: "GET" },
    );
  },

  // UC1, step 3 (continued): "the user enters the verification code and
  // sets a new password" → activates the account.
  completeRegistration({ token, code, newPassword, confirmNewPassword }) {
    return request("/api/auth/complete-registration", {
      method: "POST",
      body: JSON.stringify({ token, code, newPassword, confirmNewPassword }),
    });
  },

  // Alt-flow Line 6: invalid/expired code → request a fresh one via the
  // token already in the URL (no email re-entry needed).
  resendCode(token) {
    return request("/api/auth/resend-code", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },

  // Forgot Password, step 1: request a 6-digit reset code by email.
  forgotPassword(email) {
    return request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  // Forgot Password, step 2: submit the code + new password.
  resetPassword({ email, code, newPassword, confirmNewPassword }) {
    return request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword, confirmNewPassword }),
    });
  },
};

export const userApi = {
  getProfile() {
    return request("/api/users/me", { method: "GET" });
  },

  updateProfile(data) {
    return request("/api/users/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  updateProfileImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/users/me/profile-image", {
      method: "POST",
      body: formData,
    });
  },

  updatePrivacy(donationPublic) {
    return request("/api/users/me/privacy", {
      method: "PUT",
      body: JSON.stringify({ donationPublic }),
    });
  },

  // ── 2FA ─────────────────────────────────────────────────────────────────

  /** Step 1: trigger OTP email (called when user flips the toggle ON). */
  initiate2FA() {
    return request("/api/users/me/two-factor/initiate", { method: "POST" });
  },

  /** Step 2: submit the 6-digit code. Returns updated UserResponse on success. */
  verify2FA(code) {
    return request("/api/users/me/two-factor/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  // Designed API for the following 2FA actions, but not currently used in the frontend:

  /** Request a fresh OTP if the previous one expired or wasn't received. */
  resend2FACode() {
    return request("/api/users/me/two-factor/resend", { method: "POST" });
  },

  /** Turn 2FA off immediately (no OTP required). */
  disable2FA() {
    return request("/api/users/me/two-factor", { method: "DELETE" });
  },

  /** Cancel a pending 2FA enable attempt (user dismissed the modal). */
  cancelPending2FA() {
    return request("/api/users/me/two-factor/cancel", { method: "POST" });
  },

  // ── Other preferences ────────────────────────────────────────────────────

  updateNotifications(enabled) {
    return request("/api/users/me/notifications", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  },

  updateExpiryAlerts(enabled) {
    return request("/api/users/me/expiry-alerts", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  },

  updateDonationUpdates(enabled) {
    return request("/api/users/me/donation-updates", {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  },

  changePassword({ currentPassword, newPassword }) {
    return request("/api/users/me/password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },
};

export const mealPlanApi = {
  getRange(startDate, endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    return request(`/api/meal-plans?${params.toString()}`, { method: "GET" });
  },
  upsert({ mealDate, mealType, name, linkedFoodItemId }) {
    return request("/api/meal-plans", {
      method: "PUT",
      body: JSON.stringify({ mealDate, mealType, name, linkedFoodItemId }),
    });
  },
  delete(id) {
    return request(`/api/meal-plans/${id}`, { method: "DELETE" });
  },
};

export const notificationApi = {
  getAll() {
    return request("/api/notifications", { method: "GET" });
  },

  getUnreadCount() {
    return request("/api/notifications/unread-count", { method: "GET" });
  },

  markAllRead() {
    return request("/api/notifications/read-all", { method: "PUT" });
  },

  markRead(id) {
    return request(`/api/notifications/${id}/read`, { method: "PUT" });
  },

  accept(id) {
    return request(`/api/notifications/${id}/accept`, { method: "POST" });
  },

  decline(id) {
    return request(`/api/notifications/${id}/decline`, { method: "POST" });
  },
};
function withCategoryParam(params, category) {
  if (category && category !== "All") {
    params.set("category", category);
  }
  return params;
}

function withRangeParams(params, range) {
  if (range?.startDate) params.set("startDate", range.startDate);
  if (range?.endDate) params.set("endDate", range.endDate);
  return params;
}

export const analyticsApi = {
  getSummary(period, category, range) {
    const params = withRangeParams(
      withCategoryParam(new URLSearchParams({ period }), category),
      range,
    );
    return request(`/api/analytics/summary?${params.toString()}`, {
      method: "GET",
    });
  },

  getInventoryOverview(category) {
    const params = withCategoryParam(new URLSearchParams(), category);
    const qs = params.toString();
    return request(`/api/analytics/inventory-overview${qs ? `?${qs}` : ""}`, {
      method: "GET",
    });
  },

  getFoodSavedBreakdown(period, category, range) {
    const params = withRangeParams(
      withCategoryParam(new URLSearchParams({ period }), category),
      range,
    );
    return request(`/api/analytics/food-saved-breakdown?${params.toString()}`, {
      method: "GET",
    });
  },

  getCommunityImpact() {
    return request("/api/analytics/community-impact", { method: "GET" });
  },

  getWasteBreakdown(period, category, range) {
    const params = withRangeParams(
      withCategoryParam(new URLSearchParams({ period }), category),
      range,
    );
    return request(`/api/analytics/waste-breakdown?${params.toString()}`, {
      method: "GET",
    });
  },
};
