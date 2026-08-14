// src/components/Auth/Login.jsx
import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { colors, fonts } from "../../theme";
import { authApi } from "../../services/api";
import { setUserEmailCookie } from "../../utils/auth";

const cardStyle = {
  maxWidth: 1350,
  minHeight: "min(860px, calc(100vh - 3rem))",
  borderRadius: 20,
  boxShadow: "0 0px 12px rgba(0, 0, 0, 0.20)",
  overflow: "hidden",
};

const illustrationFrameStyle = {
  background: colors.greenLrgb,
  borderRadius: "10px 130px 10px 130px",
  boxShadow: "0 0px 10px rgba(0,0,0, 0.15)",
  position: "relative",
};

const inputStyle = {
  background: colors.white,
  border: `1px solid ${colors.border}`,
  fontFamily: fonts.body,
  fontSize: "1rem",
  color: colors.charcoal,
  height: "3rem",
  padding: "0.375rem 0.75rem",
};

const bodyTextStyle = {
  fontFamily: fonts.body,
  color: colors.charcoal,
};

export default function Login({ onNavigate }) {
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    return { email: email || "", password: "", rememberMe: false };
  });
  const [loginStage, setLoginStage] = useState("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [fieldErrors, setFieldErrors] = useState({});
  const [errMsg, setErrMsg] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState("idle");

  const [verifyToast, setVerifyToast] = useState(() => {
    try {
      const raw = sessionStorage.getItem("zw_verify_toast");
      if (!raw) return null;
      sessionStorage.removeItem("zw_verify_toast");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (needsVerification) {
      setNeedsVerification(false);
      setResendStatus("idle");
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!form.email.includes("@"))
      errors.email = "Enter a valid email address.";
    if (!form.password) errors.password = "Password is required.";
    return Object.keys(errors).length ? errors : null;
  };

  useEffect(() => {
    if (!verifyToast) return;
    const timer = setTimeout(() => setVerifyToast(null), 6000);
    return () => clearTimeout(timer);
  }, [verifyToast]);

  // CHANGED: listen for a verification success broadcast from another tab
  // (the one the user's email link opened). If this tab is currently
  // stuck showing "please verify your email," clear that state and let
  // the user know they can log in now — no manual tab-switching needed.
  useEffect(() => {
    function handleVerifiedBroadcast(e) {
      if (e.key !== "zw_email_verified_broadcast" || !e.newValue) return;

      let payload;
      try {
        payload = JSON.parse(e.newValue);
      } catch {
        return;
      }
      if (!payload?.success) return;

      // Only act if this tab is actually waiting on a verification —
      // otherwise a broadcast meant for a different tab/account could
      // wrongly clear state here.
      setNeedsVerification((wasWaiting) => {
        if (!wasWaiting) return wasWaiting;
        setResendStatus("idle");
        setErrMsg("");
        setInfoMsg(
          "Your email was just verified in another tab — you can log in now.",
        );
        return false;
      });
    }

    window.addEventListener("storage", handleVerifiedBroadcast);
    return () => window.removeEventListener("storage", handleVerifiedBroadcast);
  }, []);

  const saveAuth = (data) => {
    if (form.rememberMe) {
      localStorage.setItem("zw_token", data.token);
      localStorage.setItem("zw_user", JSON.stringify(data.user));
    } else {
      sessionStorage.setItem("zw_token", data.token);
      sessionStorage.setItem("zw_user", JSON.stringify(data.user));
    }
    setUserEmailCookie(data.user?.email || form.email.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loginStage === "otp") {
      return handleVerifyOtp();
    }

    const validationErrors = validate();
    if (validationErrors) {
      setFieldErrors(validationErrors);
      setErrMsg("");
      setStatus("error");
      return;
    }

    setFieldErrors({});
    setStatus("loading");
    setErrMsg("");
    setInfoMsg("");
    setNeedsVerification(false);
    setResendStatus("idle");
    try {
      const data = await authApi.login(form.email, form.password);
      if (data.twoFactorRequired) {
        setPendingEmail(form.email.trim());
        setLoginStage("otp");
        setInfoMsg(
          data.message ||
            "Enter the code sent to your email to finish signing in.",
        );
        setStatus("idle");
        return;
      }
      saveAuth(data);
      onNavigate?.("dashboard");
    } catch (err) {
      setErrMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
      // A 403 here means the account exists but hasn't verified its email yet —
      // surface the resend option instead of leaving the user stuck.
      if (err.status === 403) {
        setNeedsVerification(true);
      }
    }
  };

  const handleResendVerification = async () => {
    setResendStatus("loading");
    setErrMsg("");
    try {
      const data = await authApi.resendVerification(form.email.trim());
      setInfoMsg(
        data.message || "Verification email resent! Please check your inbox.",
      );
      setResendStatus("sent");
    } catch (err) {
      setErrMsg(
        err.message ||
          "Couldn't resend the verification email. Please try again.",
      );
      setResendStatus("idle");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setErrMsg("Please enter the 6-digit verification code.");
      setStatus("error");
      return;
    }

    setFieldErrors({});
    setStatus("loading");
    setErrMsg("");
    setInfoMsg("");
    try {
      const data = await authApi.verifyLoginOtp(
        pendingEmail || form.email,
        otpCode.trim(),
      );
      saveAuth(data);
      onNavigate?.("dashboard");
    } catch (err) {
      setErrMsg(err.message || "Invalid code. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-5"
      style={{ background: colors.white }}
    >
      {/* CHANGED: top-right toast for email verification result */}
      {verifyToast && (
        <div
          role="alert"
          className="d-flex align-items-start justify-content-between gap-3"
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 1080,
            maxWidth: 360,
            padding: "0.9rem 1.1rem",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            background: verifyToast.success ? "#e9f7ef" : "#fdecea",
            border: `1px solid ${verifyToast.success ? "#2f9e44" : "#d64545"}`,
            color: verifyToast.success ? "#1b5e20" : "#7a1f1f",
            ...bodyTextStyle,
          }}
        >
          <div>
            <p className="mb-1 fw-bold" style={{ fontSize: "0.9rem" }}>
              {verifyToast.success
                ? "Email Verified"
                : "Verification Unsuccessful"}
            </p>
            <p className="mb-0" style={{ fontSize: "0.85rem" }}>
              {verifyToast.message ||
                (verifyToast.success
                  ? "Your email has been verified. You can now log in."
                  : "We couldn't verify your email. Please try again.")}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setVerifyToast(null)}
            style={{
              background: "none",
              border: "none",
              lineHeight: 1,
              fontSize: "1.1rem",
              color: "inherit",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      )}

      <div
        className="login-card row g-0 w-100"
        style={{
          ...cardStyle,
          minHeight: "min(860px, calc(100vh - 3rem))",
          height: "auto",
        }}
      >
        <style>{`

          .back-to-home-btn {
            position: relative;
            overflow: visible;
          }
          .back-to-home-btn::before,
          .back-to-home-btn::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            width: 0;
            height: 2px;
            border-radius: 5px;
            background: ${colors.greenD};
            transition: width 0.25s ease;
          }

          .back-to-home-btn:hover::before,
          .back-to-home-btn:hover::after {
            width: 100%;
          }

          .login-btn {
            opacity: 0.75;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }

          .login-btn:hover:not(:disabled) {
            opacity: 1 !important;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }

          .login-input:focus {
            border-color: ${colors.authGreen};
            outline: none;
          }

          .create-account-btn:hover {
            border-bottom: 1px solid ${colors.greenD};
          }
        `}</style>
        <div
          className="col-lg-6 d-none d-lg-flex flex-column justify-content-between px-5 py-5"
          style={{
            background: colors.authGreen,
            minHeight: "100%",
          }}
        >
          <div>
            <p
              className="mb-3 text-dark"
              style={{ ...bodyTextStyle, fontSize: "0.8rem", fontWeight: 600 }}
            >
              A Quiet Revolution
            </p>
            <h2
              className="fw-bold text-dark lh-sm mb-3"
              style={{
                fontFamily: fonts.display,
                fontSize: "clamp(2rem, 3vw, 2.8rem)",
                maxWidth: 420,
              }}
            >
              Every saved plate is a small kindness.
            </h2>
            <p
              className="text-dark"
              style={{
                ...bodyTextStyle,
                fontSize: "1rem",
                maxWidth: 420,
                lineHeight: 1.75,
              }}
            >
              Join thousands of households turning surplus into shared meals.
            </p>
          </div>

          <div className="d-flex align-items-center justify-content-center py-4">
            <div
              className="w-100 d-flex align-items-center justify-content-center p-4 login-illustration"
              style={{
                ...illustrationFrameStyle,
                maxWidth: 380,
                maxHeight: 480,
              }}
            >
              <img
                draggable="false"
                src="/images/sign-in-character.png"
                alt="3d character illustration"
                className="img-fluid"
                style={{ maxWidth: 365, position: "relative", zIndex: 1 }}
              />
            </div>
          </div>

          <p
            className="text-center text-muted mb-0"
            style={{ ...bodyTextStyle, fontSize: "1rem" }}
          >
            © 2026 ZeroWaste Ltd. All rights reserved.
          </p>
        </div>

        <div
          className="col-12 col-lg-6 d-flex flex-column justify-content-center px-4 px-xl-5 py-5"
          style={{
            background: colors.authGreen,
            minHeight: "100%",
            borderLeft: `2px solid ${colors.greenD}`,
          }}
        >
          <div className="mx-auto" style={{ maxWidth: 400, width: "100%" }}>
            <button
              type="button"
              className="btn back-to-home-btn btn-link p-1 text-dark d-inline-flex align-items-center mb-4"
              style={{
                ...bodyTextStyle,
                fontSize: "0.9rem",
                textDecoration: "none",
                fontWeight: 600,
                color: colors.charcoal,
              }}
              onClick={() => onNavigate?.("home")}
            >
              <ArrowLeft size={16} className="me-2" />
              Back to home
            </button>

            <div className="text-center mb-4">
              <img
                draggable="false"
                src="/images/zerowaste-logo.png"
                alt="ZeroWaste"
                className="img-fluid"
                style={{ maxWidth: 130 }}
              />
            </div>

            <h1
              className="text-center fw-bold text-dark mb-2"
              style={{ fontSize: "1.45rem" }}
            >
              Welcome Back
            </h1>
            <p
              className="text-center text-dark mb-4"
              style={{
                ...bodyTextStyle,
                fontSize: "0.95rem",
                color: colors.muted,
              }}
            >
              Log in to your SavePlate account.
            </p>

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              {infoMsg && (
                <div
                  className="alert alert-success py-2 mb-0"
                  style={{ fontSize: "0.9rem" }}
                >
                  {infoMsg}
                </div>
              )}
              {errMsg && !Object.keys(fieldErrors).length && (
                <div
                  className="alert alert-danger py-2 mb-0"
                  style={{ fontSize: "0.9rem" }}
                >
                  {errMsg}
                </div>
              )}

              {/* {needsVerification && loginStage === "credentials" && (
                <button
                  type="button"
                  className="btn btn-link p-0 text-start"
                  style={{ ...bodyTextStyle, fontSize: "0.9rem", color: colors.greenD }}
                  onClick={handleResendVerification}
                  disabled={resendStatus === "loading" || resendStatus === "sent"}
                >
                  {resendStatus === "loading"
                    ? "Resending…"
                    : resendStatus === "sent"
                    ? "Verification email sent"
                    : "Resend verification email"}
                </button>
              )} */}

              <div>
                <label
                  htmlFor="email"
                  className="form-label fw-semibold text-dark mb-2"
                  style={{ ...bodyTextStyle, fontSize: "0.95rem" }}
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control rounded-3 py-2 login-input"
                  placeholder="someone@gmail.com"
                  style={{ ...inputStyle, fontFamily: fonts.body }}
                  value={
                    loginStage === "otp"
                      ? pendingEmail || form.email
                      : form.email
                  }
                  onChange={handleChange}
                  required
                  readOnly={loginStage === "otp"}
                />
                {fieldErrors.email && (
                  <p className="text-danger small mt-2 mb-0">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {loginStage === "otp" ? (
                <div>
                  <label
                    htmlFor="otpCode"
                    className="form-label fw-semibold text-dark mb-2"
                    style={{ ...bodyTextStyle, fontSize: "0.95rem" }}
                  >
                    Verification code
                  </label>
                  <input
                    id="otpCode"
                    name="otpCode"
                    type="text"
                    inputMode="numeric"
                    className="form-control rounded-3 py-2 login-input"
                    style={{ ...inputStyle, fontFamily: fonts.body }}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                  />
                  <p className="text-muted small mt-2 mb-0">
                    Enter the 6-digit code sent to your email.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="password"
                      className="form-label fw-semibold text-dark mb-2"
                      style={{ ...bodyTextStyle, fontSize: "0.95rem" }}
                    >
                      Password
                    </label>
                    <div className="position-relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        className="form-control rounded-3 py-2 pe-5 login-input"
                        style={{ ...inputStyle, paddingRight: "3rem" }}
                        value={form.password}
                        onChange={handleChange}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-link position-absolute top-50 end-0 translate-middle-y p-0 me-3 border-0 text-secondary"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        style={{ color: colors.muted }}
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-danger small mt-2 mb-0">
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>

                  <div className="d-flex align-items-center justify-content-between">
                    <label
                      className="form-check-label d-flex align-items-center gap-2"
                      style={{ ...bodyTextStyle, fontSize: "0.9rem" }}
                    >
                      <input
                        id="rememberMe"
                        name="rememberMe"
                        type="checkbox"
                        className="form-check-input"
                        checked={form.rememberMe}
                        onChange={handleChange}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: colors.authGreen,
                        }}
                      />
                      Remember Me
                    </label>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-dark"
                      style={{
                        ...bodyTextStyle,
                        fontSize: "0.9rem",
                        textDecoration: "none",
                        color: colors.charcoal,
                      }}
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {needsVerification && loginStage === "credentials" && (
                    <button
                      type="button"
                      className="btn btn-link p-0 text-start"
                      style={{
                        ...bodyTextStyle,
                        fontSize: "0.9rem",
                        color: colors.greenD,
                      }}
                      onClick={handleResendVerification}
                      disabled={
                        resendStatus === "loading" || resendStatus === "sent"
                      }
                    >
                      {resendStatus === "loading"
                        ? "Resending…"
                        : resendStatus === "sent"
                          ? "Verification email sent"
                          : "Resend verification email"}
                    </button>
                  )}
                </>
              )}

              <button
                type="submit"
                className="btn w-100 text-white fw-bold text-uppercase rounded-3 py-2 login-btn"
                style={{
                  ...bodyTextStyle,
                  height: "3.5rem",
                  opacity: "0.75",
                  background: colors.green,
                  fontSize: "0.95rem",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  transition:
                    "background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease",
                }}
                disabled={status === "loading"}
              >
                {loginStage === "otp" ? "Verify Code" : "Login"}
              </button>

              {loginStage === "otp" && (
                <button
                  type="button"
                  className="btn btn-link text-dark px-0"
                  style={{ ...bodyTextStyle, fontSize: "0.9rem" }}
                  onClick={() => {
                    setLoginStage("credentials");
                    setInfoMsg("");
                    setErrMsg("");
                    setOtpCode("");
                  }}
                >
                  Back to sign in
                </button>
              )}
            </form>

            <p
              className="text-center text-dark mt-4 mb-0"
              style={{ ...bodyTextStyle, fontSize: "0.95rem" }}
            >
              New here?{" "}
              <button
                type="button"
                className="btn create-account-btn btn-link "
                style={{
                  borderRadius: 0,
                  textDecoration: "none",
                  padding: "0 0 1px 0",
                  ...bodyTextStyle,
                  fontSize: "0.95rem",
                  color: colors.greenD,
                }}
                onClick={() => onNavigate?.("signup")}
              >
                Create an account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
