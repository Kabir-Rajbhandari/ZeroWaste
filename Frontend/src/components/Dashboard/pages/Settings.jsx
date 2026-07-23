// src/components/Dashboard/pages/Settings.jsx
import { useEffect, useRef, useState } from "react";
import { User, ShieldCheck, ShieldOff, Mail, RefreshCw } from "lucide-react";
import { colors, fonts, btnPrimaryStyle } from "../../../theme";
import { resolveAssetUrl, userApi } from "../../../services/api";
import { getStoredUser, setStoredUser } from "../../../utils/auth";

const inputStyle = {
  borderColor: colors.greenLrgb,
  borderWidth: "2px",
  borderRadius: 8,
  fontSize: "0.9rem",
  padding: "0.6rem 0.9rem",
  background: colors.white,
};

const labelStyle = {
  fontWeight: 500,
  fontSize: "0.88rem",
  color: colors.charcoal,
  marginBottom: "0.35rem",
};

const cardStyle = {
  background: colors.authBg,
  border: `2px solid ${colors.greenLrgb}`,
};

function SectionHeading({ children }) {
  return (
    <h5
      style={{
        fontFamily: fonts.body,
        fontWeight: 500,
        color: colors.charcoal,
        display: "inline-block",
        borderBottom: `2px solid ${colors.greenLrgb}`,
        paddingBottom: 4,
        marginBottom: "1.25rem",
      }}
    >
      {children}
    </h5>
  );
}

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        border: `1.5px solid ${checked ? colors.green : colors.greenL}`,
        background: checked ? colors.greenL : colors.white,
        position: "relative",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
        transition: "all 0.15s ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: checked ? colors.white : "#778873",
          transition: "left 0.15s ease",
        }}
      />
    </button>
  );
}

function PreferenceRow({ title, description, checked, onChange, disabled }) {
  return (
    <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
      <div>
        <div
          style={{
            fontWeight: 700,
            fontSize: "0.9rem",
            color: colors.charcoal,
          }}
        >
          {title}
        </div>
        {description && (
          <div style={{ fontSize: "0.8rem", color: colors.muted }}>
            {description}
          </div>
        )}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── 2FA OTP Modal ─────────────────────────────────────────────────────────────
function TwoFAModal({ userEmail, onVerified, onCancel }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  // focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const code = digits.join("");

  const handleDigitChange = (idx, value) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError("");
    if (char && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setVerifying(true);
    setError("");
    setInfo("");
    try {
      const updated = await userApi.verify2FA(code);
      onVerified(updated);
    } catch (err) {
      setError(err.message || "Invalid code. Please try again.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setInfo("");
    try {
      await userApi.resend2FACode();
      setInfo("A new code has been sent to your email.");
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || "Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleCancel = async () => {
    try {
      await userApi.cancelPending2FA();
    } catch {
      // best-effort
    }
    onCancel();
  };

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,0.45)", zIndex: 1050 }}
    >
      <div
        className="rounded-3 p-4"
        style={{
          background: colors.authBg,
          width: 420,
          maxWidth: "95%",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
        }}
      >
        {/* Header */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 40,
              height: 40,
              background: "rgba(62,160,102,0.15)",
            }}
          >
            <Mail size={20} color={colors.green} />
          </div>
          <div>
            <h5
              style={{
                fontFamily: fonts.body,
                color: colors.charcoal,
                margin: 0,
                fontWeight: 700,
              }}
            >
              Verify Your Email
            </h5>
            <div style={{ fontSize: "0.78rem", color: colors.muted }}>
              Two-Factor Authentication Setup
            </div>
          </div>
        </div>

        <p
          style={{
            fontSize: "0.88rem",
            color: colors.muted,
            marginBottom: "1.25rem",
            lineHeight: 1.6,
          }}
        >
          A 6-digit verification code was sent to{" "}
          <strong style={{ color: colors.charcoal }}>{userEmail}</strong>. Enter
          it below to enable 2FA on your account.
        </p>

        {/* OTP input boxes */}
        <div
          className="d-flex justify-content-center gap-2 mb-3"
          onPaste={handlePaste}
        >
          {digits.map((d, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={verifying}
              style={{
                width: 46,
                height: 54,
                textAlign: "center",
                fontSize: "1.5rem",
                fontWeight: 700,
                borderRadius: 8,
                border: `2px solid ${d ? colors.green : colors.greenLrgb}`,
                background: d ? "rgba(62,160,102,0.07)" : colors.white,
                color: colors.charcoal,
                outline: "none",
                transition: "border-color 0.15s",
              }}
            />
          ))}
        </div>

        {/* Feedback */}
        {error && (
          <div
            className="alert alert-danger py-2 small mb-3"
            style={{ borderRadius: 8 }}
          >
            {error}
          </div>
        )}
        {info && (
          <div
            className="alert alert-success py-2 small mb-3"
            style={{ borderRadius: 8 }}
          >
            {info}
          </div>
        )}

        {/* Resend */}
        <div className="text-center mb-3">
          <button
            type="button"
            className="btn btn-link p-0 d-inline-flex align-items-center gap-1"
            style={{
              fontSize: "0.83rem",
              color: colors.green,
              textDecoration: "none",
            }}
            disabled={resending || verifying}
            onClick={handleResend}
          >
            <RefreshCw size={14} />
            {resending ? "Sending…" : "Resend Code"}
          </button>
        </div>

        {/* Actions */}
        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn"
            style={{
              opacity: 0.7,
              borderColor: colors.green,
              color: colors.charcoal,
              fontWeight: 600,
              borderRadius: 6,
              borderWidth: "2px",
              padding: "0.45rem 1.25rem",
              fontSize: "0.9rem",
            }}
            onClick={handleCancel}
            disabled={verifying}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            style={{
              ...btnPrimaryStyle,
              color: colors.white,
              fontWeight: 600,
              padding: "0 1.5rem",
              fontSize: "0.9rem",
              height: 40,
              borderRadius: 6,
              opacity: code.length === 6 ? 1 : 0.65,
            }}
            disabled={verifying || code.length !== 6}
            onClick={handleVerify}
          >
            {verifying ? "Verifying…" : "Verify & Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings component ───────────────────────────────────────────────────
export default function Settings({ onProfileUpdated }) {
  // ---- Profile Information ----
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    gender: "",
    address: "",
    householdSize: "",
    profileImageUrl: "",
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const fileInputRef = useRef(null);

  // ---- Privacy ----
  const [donationPublic, setDonationPublic] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacyMsg, setPrivacyMsg] = useState("");

  // ---- 2FA ----
  const [twoFactor, setTwoFactor] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [initiating2FA, setInitiating2FA] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState({ type: "", text: "" });

  // ---- Notifications ----
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationsMsg, setNotificationsMsg] = useState("");

  const [expiryAlerts, setExpiryAlerts] = useState(true);
  const [savingExpiryAlerts, setSavingExpiryAlerts] = useState(false);
  const [expiryAlertsMsg, setExpiryAlertsMsg] = useState("");

  const [donationUpdates, setDonationUpdates] = useState(true);

  // ---- Password modal ----
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: "", text: "" });

  // ── Load profile on mount ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      try {
        const data = await userApi.getProfile();
        if (cancelled) return;
        setProfile({
          fullName: data.fullName || "",
          email: data.email || "",
          gender: data.gender || "",
          address: data.address || "",
          householdSize:
            data.householdSize == null ? "" : String(data.householdSize),
          profileImageUrl: data.profileImageUrl || "",
        });
        setDonationPublic(data.donationPublic !== false);
        setTwoFactor(data.twoFactorEnabled === true);
        setNotificationsEnabled(data.notificationsEnabled !== false);
        setExpiryAlerts(data.expiryAlertsEnabled !== false);
        setDonationUpdates(data.donationUpdatesEnabled !== false);
      } catch (err) {
        if (!cancelled)
          setProfileMsg({
            type: "danger",
            text: err.message || "Failed to load profile.",
          });
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Profile ────────────────────────────────────────────────────────────────
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.fullName.trim()) {
      setProfileMsg({ type: "danger", text: "Full name is required." });
      return;
    }
    if (!profile.email.trim()) {
      setProfileMsg({ type: "danger", text: "Email is required." });
      return;
    }

    setSavingProfile(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const updated = await userApi.updateProfile({
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
        gender: profile.gender.trim(),
        address: profile.address.trim(),
        householdSize:
          profile.householdSize === "" ? null : Number(profile.householdSize),
      });
      setProfile({
        fullName: updated.fullName || "",
        email: updated.email || "",
        gender: updated.gender || "",
        address: updated.address || "",
        householdSize:
          updated.householdSize == null ? "" : String(updated.householdSize),
        profileImageUrl: updated.profileImageUrl || profile.profileImageUrl,
      });
      const cached = getStoredUser();
      setStoredUser({ ...cached, ...updated });
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
      onProfileUpdated?.();
    } catch (err) {
      setProfileMsg({
        type: "danger",
        text: err.message || "Failed to update profile.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Privacy ────────────────────────────────────────────────────────────────
  const handleTogglePrivacy = async (nextValue) => {
    const previous = donationPublic;
    setDonationPublic(nextValue);
    setSavingPrivacy(true);
    setPrivacyMsg("");
    try {
      const updated = await userApi.updatePrivacy(nextValue);
      setDonationPublic(updated.donationPublic !== false);
      const cached = getStoredUser();
      setStoredUser({ ...cached, donationPublic: updated.donationPublic });
    } catch (err) {
      setDonationPublic(previous);
      setPrivacyMsg(err.message || "Failed to update privacy setting.");
    } finally {
      setSavingPrivacy(false);
    }
  };

  // ── 2FA ────────────────────────────────────────────────────────────────────
  const handleToggle2FA = async (nextValue) => {
    setTwoFactorMsg({ type: "", text: "" });

    if (!nextValue) {
      // Turning OFF — immediate, no OTP needed
      try {
        const updated = await userApi.disable2FA();
        setTwoFactor(updated.twoFactorEnabled === true);
        setTwoFactorMsg({
          type: "success",
          text: "Two-factor authentication has been disabled.",
        });
      } catch (err) {
        setTwoFactorMsg({
          type: "danger",
          text: err.message || "Failed to disable 2FA.",
        });
      }
      return;
    }

    // Turning ON — send OTP email then show modal
    setInitiating2FA(true);
    try {
      await userApi.initiate2FA();
      setShow2FAModal(true);
    } catch (err) {
      setTwoFactorMsg({
        type: "danger",
        text:
          err.message || "Failed to send verification email. Please try again.",
      });
    } finally {
      setInitiating2FA(false);
    }
  };

  /** Called by TwoFAModal when OTP is verified successfully */
  const handle2FAVerified = (updatedUser) => {
    setShow2FAModal(false);
    setTwoFactor(updatedUser.twoFactorEnabled === true);
    const cached = getStoredUser();
    setStoredUser({
      ...cached,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
    });
    setTwoFactorMsg({
      type: "success",
      text: "Two-factor authentication is now enabled on your account.",
    });
  };

  /** Called by TwoFAModal when the user cancels without verifying */
  const handle2FAModalCancel = () => {
    setShow2FAModal(false);
    setTwoFactor(false); // toggle snaps back to OFF
    setTwoFactorMsg({ type: "", text: "" });
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  const handleToggleNotifications = async (nextValue) => {
    const previous = notificationsEnabled;
    setNotificationsEnabled(nextValue);
    setSavingNotifications(true);
    setNotificationsMsg("");
    try {
      const updated = await userApi.updateNotifications(nextValue);
      setNotificationsEnabled(updated.notificationsEnabled !== false);
      setExpiryAlerts(updated.expiryAlertsEnabled !== false);
      setDonationUpdates(updated.donationUpdatesEnabled !== false);
    } catch (err) {
      setNotificationsEnabled(previous);
      setNotificationsMsg(
        err.message || "Failed to update notification preferences.",
      );
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleToggleExpiryAlerts = async (nextValue) => {
    if (!notificationsEnabled) return;
    const previous = expiryAlerts;
    setExpiryAlerts(nextValue);
    setSavingExpiryAlerts(true);
    setExpiryAlertsMsg("");
    try {
      const updated = await userApi.updateExpiryAlerts(nextValue);
      setExpiryAlerts(updated.expiryAlertsEnabled !== false);
    } catch (err) {
      setExpiryAlerts(previous);
      setExpiryAlertsMsg(err.message || "Failed to update expiry alerts.");
    } finally {
      setSavingExpiryAlerts(false);
    }
  };

  const handleToggleDonationUpdates = async (nextValue) => {
    if (!notificationsEnabled) return;
    const previous = donationUpdates;
    setDonationUpdates(nextValue);
    try {
      const updated = await userApi.updateDonationUpdates(nextValue);
      setDonationUpdates(updated.donationUpdatesEnabled !== false);
      setNotificationsEnabled(updated.notificationsEnabled !== false);
    } catch (err) {
      setDonationUpdates(previous);
      setNotificationsMsg(err.message || "Failed to update donation updates.");
    }
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const updated = await userApi.updateProfileImage(file);
      setProfile((prev) => ({
        ...prev,
        profileImageUrl: updated.profileImageUrl || "",
      }));
      const cached = getStoredUser();
      setStoredUser({
        ...cached,
        profileImageUrl: updated.profileImageUrl || "",
      });
      setProfileMsg({ type: "success", text: "Profile picture updated." });
      onProfileUpdated?.();
    } catch (err) {
      setProfileMsg({
        type: "danger",
        text: err.message || "Failed to upload profile picture.",
      });
    }
  };

  // ── Password modal ─────────────────────────────────────────────────────────
  const handlePwdChange = (e) => {
    const { name, value } = e.target;
    setPwdForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg({ type: "danger", text: "New passwords do not match." });
      return;
    }
    setSavingPwd(true);
    setPwdMsg({ type: "", text: "" });
    try {
      await userApi.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdMsg({ type: "success", text: "Password updated successfully." });
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPwdModal(false);
    } catch (err) {
      setPwdMsg({
        type: "danger",
        text: err.message || "Failed to update password.",
      });
    } finally {
      setSavingPwd(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        .changePwd-btn {
          opacity: 0.75;
          transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }
        .changePwd-btn:hover:not(:disabled) {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.16);
        }
        .save-changes, .upload-btn {
          opacity: 0.75;
          transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }
        .save-changes:hover:not(:disabled), .upload-btn:hover:not(:disabled) {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.16);
        }
        .save-password {
          opacity: 0.75;
          transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
        }
        .save-password:hover:not(:disabled) {
          opacity: 1;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.16);
        }
        .cancel-btn {
          transition: all 0.25s ease;
        }
        .cancel-btn:hover {
          opacity: 1 !important;
          background: ${colors.greenLrgb};
          border-color: transparent;
        }
        .otp-input:focus {
          outline: none;
          border-color: ${colors.green} !important;
          box-shadow: 0 0 0 3px rgba(62,160,102,0.2);
        }
      `}</style>

      <div className="mb-4">
        <h1
          style={{
            opacity: 0.75,
            fontFamily: fonts.body,
            fontSize: "1.60rem",
            fontWeight: 700,
            color: colors.charcoal,
            marginBottom: "0.25rem",
          }}
        >
          Settings
        </h1>
        <p className="mb-0" style={{ color: colors.muted }}>
          Manage your profile, security, and notification preferences.
        </p>
      </div>

      <div className="row g-4">
        {/* ── Left: Profile ── */}
        <div className="col-12 col-lg-6">
          <div className="rounded-4 p-4 h-100" style={cardStyle}>
            <SectionHeading>Profile Information</SectionHeading>

            <div className="text-center mb-4">
              <label
                htmlFor="profile-image-upload"
                className="d-inline-flex align-items-center justify-content-center rounded-circle mb-2"
                style={{
                  width: 90,
                  height: 90,
                  background: colors.greenLrgb,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
              >
                {profile.profileImageUrl ? (
                  <img
                    src={resolveAssetUrl(profile.profileImageUrl)}
                    alt="Profile"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <User size={40} color={colors.muted} />
                )}
              </label>
              <input
                ref={fileInputRef}
                id="profile-image-upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleProfileImageUpload}
              />
              <div className="d-flex justify-content-center mt-2">
                <button
                  type="button"
                  className="btn btn-sm upload-btn"
                  style={{
                    ...btnPrimaryStyle,
                    padding: "0.45rem 0.9rem",
                    fontSize: "0.8rem",
                    borderRadius: 6,
                    color: colors.white,
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload photo
                </button>
              </div>
            </div>

            {profileMsg.text && (
              <div
                className={`alert alert-${profileMsg.type === "success" ? "success" : "danger"} py-2 small`}
              >
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveProfile}>
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>
                  Full Name:
                </label>
                <input
                  type="text"
                  name="fullName"
                  className="form-control"
                  style={inputStyle}
                  value={profile.fullName}
                  onChange={handleProfileChange}
                  disabled={loadingProfile}
                  placeholder="Full name"
                />
              </div>
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>
                  Email:
                </label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  style={inputStyle}
                  value={profile.email}
                  onChange={handleProfileChange}
                  disabled={loadingProfile}
                  placeholder="someone@gmail.com"
                />
              </div>
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>
                  Gender:
                </label>
                <input
                  type="text"
                  name="gender"
                  className="form-control"
                  style={inputStyle}
                  value={profile.gender}
                  onChange={handleProfileChange}
                  disabled={loadingProfile}
                  placeholder="Male"
                />
              </div>
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>
                  Address:
                </label>
                <input
                  type="text"
                  name="address"
                  className="form-control"
                  style={inputStyle}
                  value={profile.address}
                  onChange={handleProfileChange}
                  disabled={loadingProfile}
                  placeholder="somewhere"
                />
              </div>
              <div className="mb-4">
                <label className="form-label" style={labelStyle}>
                  Household Size (optional):
                </label>
                <input
                  type="number"
                  name="householdSize"
                  min="1"
                  className="form-control"
                  style={inputStyle}
                  value={profile.householdSize}
                  onChange={handleProfileChange}
                  disabled={loadingProfile}
                  placeholder="e.g. 4"
                />
              </div>
              <div className="text-center">
                <button
                  type="submit"
                  className="btn px-4 save-changes"
                  style={{
                    ...btnPrimaryStyle,
                    color: colors.white,
                    fontWeight: 600,
                    padding: "0 1rem",
                    fontSize: "0.9rem",
                    height: 40,
                    borderRadius: 4,
                  }}
                  disabled={loadingProfile || savingProfile}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="col-12 col-lg-6 d-flex flex-column gap-4">
          {/* Security */}
          <div className="rounded-4 p-4" style={cardStyle}>
            <SectionHeading>Security</SectionHeading>

            {twoFactorMsg.text && (
              <div
                className={`alert alert-${twoFactorMsg.type === "success" ? "success" : "danger"} py-2 small mb-3`}
                style={{ borderRadius: 8 }}
              >
                {twoFactorMsg.type === "success" ? (
                  <span>
                    <ShieldCheck size={14} className="me-1" />
                    {twoFactorMsg.text}
                  </span>
                ) : (
                  <span>
                    <ShieldOff size={14} className="me-1" />
                    {twoFactorMsg.text}
                  </span>
                )}
              </div>
            )}

            <PreferenceRow
              title="Two-Factor Authentication"
              description={
                twoFactor
                  ? "Your account is protected with email verification."
                  : "Enable to add an extra layer of security. We'll email you a 6-digit code to confirm."
              }
              checked={twoFactor}
              onChange={handleToggle2FA}
              disabled={initiating2FA || loadingProfile}
            />

            {initiating2FA && (
              <p className="small mb-3" style={{ color: colors.muted }}>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Sending verification code to your email…
              </p>
            )}

            <button
              type="button"
              className="btn mb-2 changePwd-btn"
              style={{
                ...btnPrimaryStyle,
                color: colors.white,
                fontWeight: 600,
                padding: "0 1rem",
                fontSize: "0.9rem",
                height: 40,
                borderRadius: 4,
              }}
              onClick={() => setShowPwdModal(true)}
            >
              Change Password
            </button>
          </div>

          {/* Privacy */}
          <div className="rounded-4 p-4" style={cardStyle}>
            <SectionHeading>Privacy</SectionHeading>
            {privacyMsg && (
              <div className="alert alert-danger py-2 small mb-3">
                {privacyMsg}
              </div>
            )}
            <PreferenceRow
              title="Make my donation public"
              description={
                donationPublic
                  ? "Visible to everyone in Browse Food Item."
                  : "Only visible to you — hidden from everyone else."
              }
              checked={donationPublic}
              onChange={handleTogglePrivacy}
              disabled={savingPrivacy || loadingProfile}
            />
          </div>

          {/* Notifications */}
          <div className="rounded-4 p-4" style={cardStyle}>
            <SectionHeading>Notification Preferences</SectionHeading>
            {(notificationsMsg || expiryAlertsMsg) && (
              <div className="alert alert-danger py-2 small mb-3">
                {notificationsMsg || expiryAlertsMsg}
              </div>
            )}
            <PreferenceRow
              title="Notifications"
              description="Turn all notification types on or off"
              checked={notificationsEnabled}
              onChange={handleToggleNotifications}
              disabled={savingNotifications || loadingProfile}
            />
            <PreferenceRow
              title="Expiry Alerts"
              description="Get notified about items nearing expiry"
              checked={expiryAlerts}
              onChange={handleToggleExpiryAlerts}
              disabled={
                savingExpiryAlerts ||
                savingNotifications ||
                loadingProfile ||
                !notificationsEnabled
              }
            />
            <PreferenceRow
              title="Donation Updates"
              description="Get updates about donation activities"
              checked={donationUpdates}
              onChange={handleToggleDonationUpdates}
              disabled={
                savingNotifications || loadingProfile || !notificationsEnabled
              }
            />
          </div>
        </div>
      </div>

      {/* ── 2FA OTP Modal, email verification features worked  ── */}
      {show2FAModal && (
        <TwoFAModal
          userEmail={profile.email}
          onVerified={handle2FAVerified}
          onCancel={handle2FAModalCancel}
        />
      )}

      {/* ── Change Password Modal ── */}
      {showPwdModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.4)", zIndex: 99 }}
        >
          <div
            className="rounded-2 p-4"
            style={{ background: colors.authBg, width: 380, maxWidth: "90%" }}
          >
            <h5 style={{ fontFamily: fonts.body, color: colors.charcoal }}>
              Change Password
            </h5>

            {pwdMsg.text && (
              <div
                className={`alert alert-${pwdMsg.type === "success" ? "success" : "danger"} py-2 small`}
              >
                {pwdMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>
                  Current Password:
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  className="form-control"
                  style={inputStyle}
                  value={pwdForm.currentPassword}
                  onChange={handlePwdChange}
                  disabled={savingPwd}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label" style={labelStyle}>
                  New Password:
                </label>
                <input
                  type="password"
                  name="newPassword"
                  className="form-control"
                  style={inputStyle}
                  value={pwdForm.newPassword}
                  onChange={handlePwdChange}
                  disabled={savingPwd}
                  required
                  minLength={8}
                />
              </div>
              <div className="mb-4">
                <label className="form-label" style={labelStyle}>
                  Confirm New Password:
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="form-control"
                  style={inputStyle}
                  value={pwdForm.confirmPassword}
                  onChange={handlePwdChange}
                  disabled={savingPwd}
                  required
                />
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn cancel-btn"
                  style={{
                    opacity: 0.65,
                    borderColor: colors.green,
                    color: colors.charcoal,
                    fontWeight: 600,
                    borderRadius: 4,
                    borderWidth: "2px",
                    padding: "0.45rem 1.25rem",
                    fontSize: "0.9rem",
                  }}
                  onClick={() => {
                    setShowPwdModal(false);
                    setPwdMsg({ type: "", text: "" });
                    setPwdForm({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                  disabled={savingPwd}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn save-password"
                  style={{
                    ...btnPrimaryStyle,
                    color: colors.white,
                    fontWeight: 600,
                    padding: "0 1rem",
                    fontSize: "0.9rem",
                    height: 40,
                    borderRadius: 4,
                  }}
                  disabled={savingPwd}
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
