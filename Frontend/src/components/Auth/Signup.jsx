// src/components/Auth/Signup.jsx
import { useState, useEffect } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { colors, fonts } from "../../theme";
import { authApi } from "../../services/api";

const INITIAL_FORM_STATE = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  householdSize: "",
};

// UC1, step 2: Privacy & Security Configuration is its own screen shown
// right after registration succeeds — not part of the registration form.
const INITIAL_SECURITY_FORM_STATE = {
  donationPublic: true,
  enableTwoFactor: false,
};

const INITIAL_COMPLETE_FORM_STATE = {
  code: "",
};

const cardStyle = {
  overflow: "hidden",
  maxWidth: 1350,
  minHeight: "min(860px, calc(100vh - 3rem))",
  borderRadius: 20,
  boxShadow: "0 0px 12px rgba(0, 0, 0, 0.20)",
};

const illustrationFrameStyle = {
  background: colors.greenLrgb,
  borderRadius: "130px 10px 130px 10px",
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

export default function Signup({ onNavigate }) {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [fieldErrors, setFieldErrors] = useState({});
  const [errMsg, setErrMsg] = useState("");

  // "form" (registration) → "security" (Privacy & Security Configuration,
  // step 2) → "checkEmail" (verification email just sent, step 3 pending).
  const [stage, setStage] = useState("form");
  const [registeredEmail, setRegisteredEmail] = useState("");

  // ── Step 2: Privacy & Security Configuration ────────────────────────────
  const [securityForm, setSecurityForm] = useState(INITIAL_SECURITY_FORM_STATE);
  const [securityStatus, setSecurityStatus] = useState("idle");
  const [securityErrMsg, setSecurityErrMsg] = useState("");

  // ── Email verification link handling (UC1, step 3) ─────────────────────
  const [verifyToken, setVerifyToken] = useState(() =>
    new URLSearchParams(window.location.search).get("token"),
  );
  // "checking" (read-only status check) → "needsCode" (show code+password
  // form) → "success" (account activated) | "alreadyVerified" | "error"
  const [verifyStatus, setVerifyStatus] = useState(
    verifyToken ? "checking" : "idle",
  );
  const [verifyMessage, setVerifyMessage] = useState("");

  // ── Code + new password entry (UC1, step 3 continued) ──────────────────
  const [completeForm, setCompleteForm] = useState(INITIAL_COMPLETE_FORM_STATE);
  const [completeFieldErrors, setCompleteFieldErrors] = useState({});
  const [completeErrMsg, setCompleteErrMsg] = useState("");
  const [completeStatus, setCompleteStatus] = useState("idle");
  const [resendCodeStatus, setResendCodeStatus] = useState("idle");

  useEffect(() => {
    if (!verifyToken) return;

    let isMounted = true;

    // Read-only precheck — does NOT activate the account. Just tells us
    // which screen to show: the code+password form, "already verified", or
    // an expired/invalid-link message.
    authApi
      .checkVerificationToken(verifyToken)
      .then((data) => {
        if (!isMounted) return;
        if (data.alreadyVerified) {
          setVerifyStatus("alreadyVerified");
          setVerifyMessage(data.message);
        } else if (data.valid) {
          setVerifyStatus("needsCode");
        } else {
          setVerifyStatus("error");
          setVerifyMessage(data.message);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setVerifyStatus("error");
          setVerifyMessage(
            err.message || "This verification link is invalid or has expired.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [verifyToken]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear field-specific error as user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = "Full name is required.";
    if (!form.email.includes("@"))
      errors.email = "Enter a valid email address.";
    if (form.password.length < 8)
      errors.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)
      errors.confirmPassword = "Passwords do not match.";
    return Object.keys(errors).length ? errors : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    try {
      await authApi.register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        householdSize:
          form.householdSize === "" ? null : Number(form.householdSize),
      });

      // UC1: registration succeeding moves the user to the Privacy &
      // Security Configuration step next — NOT straight to login, and NOT
      // straight to "check your email" (the email isn't sent until that
      // step is submitted).
      setRegisteredEmail(form.email.trim());
      setForm({ ...INITIAL_FORM_STATE });
      setStatus("idle");
      setStage("security");
    } catch (err) {
      setErrMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  // ── Step 2: Privacy & Security Configuration ────────────────────────────
  const handleSecurityChange = (e) => {
    const { name, checked } = e.target;
    setSecurityForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();
    setSecurityStatus("loading");
    setSecurityErrMsg("");

    try {
      await authApi.configureSecurity({
        email: registeredEmail,
        donationPublic: securityForm.donationPublic,
        enableTwoFactor: securityForm.enableTwoFactor,
      });
      setSecurityStatus("idle");
      // Step 3: system now sends the welcome email with the link + code.
      setStage("checkEmail");
    } catch (err) {
      setSecurityErrMsg(
        err.message || "Couldn't save your settings. Please try again.",
      );
      setSecurityStatus("error");
    }
  };

  // ── Code + new password submission (UC1, step 3 continued) ─────────────
  const handleCompleteChange = (e) => {
    const { name, value } = e.target;
    setCompleteForm((prev) => ({ ...prev, [name]: value }));
    if (completeFieldErrors[name]) {
      setCompleteFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateComplete = () => {
    const errors = {};
    if (!/^\d{6}$/.test(completeForm.code.trim()))
      errors.code = "Enter the 6-digit code from your email.";
    return Object.keys(errors).length ? errors : null;
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateComplete();
    if (validationErrors) {
      setCompleteFieldErrors(validationErrors);
      setCompleteErrMsg("");
      return;
    }

    setCompleteFieldErrors({});
    setCompleteErrMsg("");
    setCompleteStatus("loading");

    try {
      const data = await authApi.completeRegistration({
        token: verifyToken,
        code: completeForm.code.trim(),
      });
      setVerifyMessage(
        data.message || "Your account has been verified and activated!",
      );
      setVerifyStatus("success");
      setCompleteStatus("idle");

      // Tell any other open tab (e.g. a Login tab sitting there waiting)
      // that a verification just succeeded.
      try {
        localStorage.setItem(
          "zw_email_verified_broadcast",
          JSON.stringify({ success: true, at: Date.now() }),
        );
      } catch {
        // localStorage unavailable — cross-tab sync just won't fire,
        // verification itself still succeeded fine
      }
    } catch (err) {
      setCompleteErrMsg(
        err.message || "Could not verify your code. Please try again.",
      );
      setCompleteStatus("error");
    }
  };

  const handleResendCode = async () => {
    setResendCodeStatus("loading");
    try {
      await authApi.resendCode(verifyToken);
      setResendCodeStatus("sent");
      setCompleteErrMsg("");
    } catch (err) {
      setCompleteErrMsg(
        err.message || "Couldn't resend the code. Please try again.",
      );
      setResendCodeStatus("idle");
    }
  };

  // ── Step 2 Screen: Privacy & Security Configuration ─────────────────────
  // Shown immediately after registration succeeds, before any email is sent.
  if (!verifyToken && stage === "security") {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-5"
        style={{ background: colors.white }}
      >
        <div
          className="p-4 p-md-5"
          style={{
            maxWidth: 480,
            width: "100%",
            background: colors.authGreen,
            borderRadius: 20,
            boxShadow: "0 0px 12px rgba(0, 0, 0, 0.20)",
          }}
        >
          <div className="text-center mb-4">
            <img
              draggable="false"
              src="/images/zerowaste-logo.png"
              alt="ZeroWaste"
              className="img-fluid mb-3"
              style={{ maxWidth: 110 }}
            />
            <h1
              className="fw-bold mb-2"
              style={{ fontSize: "1.3rem", color: colors.greenD }}
            >
              Privacy &amp; Security
            </h1>
            <p style={{ ...bodyTextStyle, fontSize: "0.9rem" }}>
              A couple of quick settings before we send your verification email.
              You can always change these later from Account Settings.
            </p>
          </div>

          {securityErrMsg && (
            <div
              className="alert alert-danger py-2 mb-3"
              style={{ fontSize: "0.85rem" }}
              role="alert"
            >
              {securityErrMsg}
            </div>
          )}

          <form
            onSubmit={handleSecuritySubmit}
            className="d-flex flex-column gap-3"
          >
            <div
              className="d-flex align-items-start gap-2 p-3 rounded-3"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              <input
                id="donationPublic"
                name="donationPublic"
                type="checkbox"
                className="form-check-input mt-1"
                checked={securityForm.donationPublic}
                onChange={handleSecurityChange}
              />
              <label
                htmlFor="donationPublic"
                className="mb-0"
                style={{ ...bodyTextStyle, fontSize: "0.85rem" }}
              >
                <span className="fw-medium d-block">
                  Make my donations visible to other households
                </span>
                When off, your donation listings are only visible to you in
                Browse Food Items.
              </label>
            </div>

            <div
              className="d-flex align-items-start gap-2 p-3 rounded-3"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              <input
                id="enableTwoFactor"
                name="enableTwoFactor"
                type="checkbox"
                className="form-check-input mt-1"
                checked={securityForm.enableTwoFactor}
                onChange={handleSecurityChange}
              />
              <label
                htmlFor="enableTwoFactor"
                className="mb-0"
                style={{ ...bodyTextStyle, fontSize: "0.85rem" }}
              >
                <span className="fw-medium d-block">
                  Enable Two-Factor Authentication (2FA)
                </span>
                We'll email you a verification code each time you log in, for
                extra account security.
              </label>
            </div>

            <button
              type="submit"
              className="btn w-100 text-white fw-bold text-uppercase rounded-3 py-2 signup-btn"
              style={{
                ...bodyTextStyle,
                marginTop: "0.25rem",
                height: "3.5rem",
                background: colors.greenL,
                fontSize: "0.9rem",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
              disabled={securityStatus === "loading"}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Step 3 Screen: "check your email" pending state
  // Shown right after configureSecurity() succeeds — the verification email
  // (link + 6-digit code) was just sent.
  if (!verifyToken && stage === "checkEmail") {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-5"
        style={{ background: colors.white }}
      >
        <div
          className="text-center p-4 p-md-5"
          style={{
            maxWidth: 460,
            width: "100%",
            background: colors.authGreen,
            borderRadius: 20,
            boxShadow: "0 0px 12px rgba(0, 0, 0, 0.20)",
          }}
        >
          <div className="mb-4">
            <img
              draggable="false"
              src="/images/zerowaste-logo.png"
              alt="ZeroWaste"
              className="img-fluid"
              style={{ maxWidth: 110 }}
            />
          </div>
          <h1
            className="fw-bold mb-3"
            style={{ fontSize: "1.3rem", color: colors.greenD }}
          >
            Check Your Email
          </h1>
          <p className="mb-4" style={{ ...bodyTextStyle, fontSize: "0.95rem" }}>
            We've sent a verification link and a 6-digit code to{" "}
            <strong>{registeredEmail}</strong>. Click the link, then enter the
            code to activate your account.
          </p>
          <button
            type="button"
            className="btn text-white fw-bold text-uppercase rounded-3 py-2 px-4 signup-btn"
            style={{
              ...bodyTextStyle,
              background: colors.greenL,
              fontSize: "0.9rem",
              letterSpacing: "0.06em",
              fontWeight: 600,
            }}
            onClick={() => onNavigate?.("login")}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Verification Screen
  if (verifyToken) {
    const isChecking = verifyStatus === "checking";
    const isSuccess = verifyStatus === "success";
    const isAlreadyVerified = verifyStatus === "alreadyVerified";
    const isNeedsCode = verifyStatus === "needsCode";
    const isDone = isSuccess || isAlreadyVerified; // both land on "Go to Login"

    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-5"
        style={{ background: colors.white }}
      >
        <div
          className="text-center p-4 p-md-5"
          style={{
            maxWidth: isNeedsCode ? 460 : 460,
            width: "100%",
            background: colors.authGreen,
            borderRadius: 20,
            boxShadow: "0 0px 12px rgba(0, 0, 0, 0.20)",
          }}
        >
          <div className="mb-4">
            <img
              draggable="false"
              src="/images/zerowaste-logo.png"
              alt="ZeroWaste"
              className="img-fluid"
              style={{ maxWidth: 110 }}
            />
          </div>

          {isChecking ? (
            <>
              <div
                className="spinner-border mb-3"
                role="status"
                style={{ color: colors.greenD }}
              >
                <span className="visually-hidden">Checking link…</span>
              </div>
              <p style={{ ...bodyTextStyle, fontSize: "1rem" }}>
                Checking your verification link…
              </p>
            </>
          ) : isNeedsCode ? (
            <div className="text-start">
              <h1
                className="fw-bold mb-2 text-center"
                style={{ fontSize: "1.3rem", color: colors.greenD }}
              >
                Verify Your Email
              </h1>
              <p
                className="mb-4 text-center"
                style={{ ...bodyTextStyle, fontSize: "0.9rem" }}
              >
                Enter the 6-digit code we emailed you to activate your account.
              </p>

              {completeErrMsg && (
                <div
                  className="alert alert-danger py-2 mb-3"
                  style={{ fontSize: "0.85rem" }}
                  role="alert"
                >
                  {completeErrMsg}
                  {completeStatus === "error" && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-link p-0"
                        style={{ fontSize: "0.85rem" }}
                        onClick={handleResendCode}
                        disabled={resendCodeStatus === "loading"}
                      >
                        {resendCodeStatus === "loading"
                          ? "Sending new code…"
                          : "Request a new code"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {resendCodeStatus === "sent" && !completeErrMsg && (
                <div
                  className="alert alert-success py-2 mb-3"
                  style={{ fontSize: "0.85rem" }}
                  role="status"
                >
                  A new code has been sent to your email.
                </div>
              )}

              <form
                onSubmit={handleCompleteSubmit}
                className="d-flex flex-column gap-3"
              >
                <div>
                  <label
                    htmlFor="code"
                    className="form-label fw-medium text-dark mb-1"
                    style={{ fontSize: "0.9rem" }}
                  >
                    Verification Code:
                  </label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    className={`form-control signup-input rounded-3 text-center ${
                      completeFieldErrors.code ? "is-invalid" : ""
                    }`}
                    placeholder="010101"
                    style={{ ...inputStyle, letterSpacing: "0.4em" }}
                    value={completeForm.code}
                    onChange={handleCompleteChange}
                    required
                  />
                  {completeFieldErrors.code && (
                    <p className="text-danger small mt-1 mb-0">
                      {completeFieldErrors.code}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn w-100 text-white fw-bold text-uppercase rounded-3 py-2 signup-btn"
                  style={{
                    ...bodyTextStyle,
                    marginTop: "0.25rem",
                    height: "3.5rem",
                    background: colors.greenL,
                    fontSize: "0.9rem",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                  }}
                  disabled={completeStatus === "loading"}
                >
                  Activate My Account
                </button>
              </form>
            </div>
          ) : (
            <>
              <h1
                className="fw-bold mb-3"
                style={{
                  fontSize: "1.3rem",
                  color: isDone ? colors.greenD : "#b02a37",
                }}
              >
                {isSuccess
                  ? "Account Activated"
                  : isAlreadyVerified
                    ? "Already Verified"
                    : "Verification Failed"}
              </h1>
              <p
                className="mb-4"
                style={{ ...bodyTextStyle, fontSize: "0.95rem" }}
              >
                {verifyMessage}
              </p>
              <button
                type="button"
                className="btn text-white fw-bold text-uppercase rounded-3 py-2 px-4 signup-btn"
                style={{
                  ...bodyTextStyle,
                  background: colors.greenL,
                  fontSize: "0.9rem",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
                onClick={() => {
                  try {
                    sessionStorage.setItem(
                      "zw_verify_toast",
                      JSON.stringify({
                        success: isDone,
                        message: verifyMessage,
                      }),
                    );
                  } catch {
                    // Ignore storage error
                  }

                  window.history.replaceState({}, "", "/signup");
                  setVerifyToken(null);
                  setVerifyStatus("idle");
                  setVerifyMessage("");
                  setCompleteForm(INITIAL_COMPLETE_FORM_STATE);
                  onNavigate?.(isDone ? "login" : "signup");
                }}
              >
                {isDone ? "Go to Login" : "Back to Sign Up"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Registration Form Screen
  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-5"
      style={{ background: colors.white }}
    >
      <div
        className="signup-card row g-0 w-100"
        style={{
          ...cardStyle,
          background: "transparent",
        }}
      >
        <style>{`
          .back-to-home {
            position: relative;
            overflow: visible;
          }
          .back-to-home::before,
          .back-to-home::after {
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
          .back-to-home:hover::before,
          .back-to-home:hover::after {
            width: 100%;
          }
          .signup-btn {
            opacity: 0.75;
            transition: opacity 0.2s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
          }
          .signup-btn:hover:not(:disabled) {
            opacity: 1 !important;
            transform: translateY(-1px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
          }
          .login-btn:hover {
            border-bottom: 1px solid ${colors.greenD};
          }
        `}</style>

        {/* Form panel */}
        <div
          className="col-12 col-lg-6 order-lg-1 d-flex align-items-center justify-content-center px-4 px-xl-5 py-4 py-xl-5 border-end border-2"
          style={{ background: colors.authGreen }}
        >
          <div className="mx-auto" style={{ maxWidth: 400, width: "100%" }}>
            <button
              type="button"
              className="btn back-to-home btn-link p-1 text-dark d-inline-flex align-items-center mb-4"
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
              Create your account
            </h1>
            <p
              className="text-center text-dark mb-4 mb-xl-5"
              style={{
                ...bodyTextStyle,
                fontSize: "0.95rem",
                color: colors.muted,
              }}
            >
              Start reducing food waste in under a minute.
            </p>

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              {errMsg && !Object.keys(fieldErrors).length && (
                <div
                  className="alert alert-danger py-2 mb-0"
                  style={{ fontSize: "0.9rem" }}
                  role="alert"
                >
                  {errMsg}
                </div>
              )}

              <div>
                <label
                  htmlFor="fullName"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: "0.95rem" }}
                >
                  Full Name:
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className={`form-control signup-input rounded-3 ${
                    fieldErrors.fullName ? "is-invalid" : ""
                  }`}
                  placeholder="John Doe"
                  style={inputStyle}
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.fullName && (
                  <p className="text-danger small mt-1 mb-0">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: "0.95rem" }}
                >
                  Email:
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`form-control signup-input rounded-3 ${
                    fieldErrors.email ? "is-invalid" : ""
                  }`}
                  placeholder="someone@gmail.com"
                  style={inputStyle}
                  value={form.email}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.email && (
                  <p className="text-danger small mt-1 mb-0">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="householdSize"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: "0.95rem" }}
                >
                  Household Size (optional):
                </label>
                <input
                  id="householdSize"
                  name="householdSize"
                  type="number"
                  min="1"
                  className="form-control signup-input rounded-3"
                  placeholder="e.g. 4"
                  style={inputStyle}
                  value={form.householdSize}
                  onChange={handleChange}
                />
                <p className="text-muted small mt-1 mb-0">
                  Leave blank if you prefer not to share it.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: "0.95rem" }}
                >
                  Password:
                </label>
                <div className="position-relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className={`form-control signup-input rounded-3 pe-5 ${
                      fieldErrors.password ? "is-invalid" : ""
                    }`}
                    style={inputStyle}
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
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-danger small mt-1 mb-0">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: "0.95rem" }}
                >
                  Confirm Password:
                </label>
                <div className="position-relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-control signup-input rounded-3 pe-5 ${
                      fieldErrors.confirmPassword ? "is-invalid" : ""
                    }`}
                    style={inputStyle}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y p-0 me-3 border-0 text-secondary"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-danger small mt-1 mb-0">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn w-100 text-white fw-bold text-uppercase rounded-3 py-2 signup-btn"
                style={{
                  ...bodyTextStyle,
                  marginTop: "0.5rem",
                  height: "3.5rem",
                  background: colors.greenL,
                  fontSize: "0.95rem",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
                disabled={status === "loading"}
              >
                Register
              </button>

              <p
                className="text-center text-dark mb-0"
                style={{ fontSize: "0.95rem" }}
              >
                By signing up you agree to our{" "}
                <button
                  type="button"
                  onClick={() => onNavigate?.("terms")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: colors.charcoal,
                    fontFamily: fonts.body,
                    fontSize: "0.95rem",
                    textDecoration: "underline",
                  }}
                >
                  Terms of Service
                </button>{" "}
                &amp;{" "}
                <button
                  type="button"
                  onClick={() => onNavigate?.("privacy")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: colors.charcoal,
                    fontFamily: fonts.body,
                    fontSize: "0.95rem",
                    textDecoration: "underline",
                  }}
                >
                  Privacy Policy
                </button>
                .
              </p>
            </form>

            <p
              className="text-center text-dark mt-4 mb-0"
              style={{ ...bodyTextStyle, fontSize: "0.95rem" }}
            >
              Already have an account?{" "}
              <button
                type="button"
                className="btn login-btn btn-link"
                style={{
                  borderRadius: 0,
                  textDecoration: "none",
                  padding: "0 0 1px 0",
                  ...bodyTextStyle,
                  fontSize: "0.95rem",
                  color: colors.greenD,
                }}
                onClick={() => onNavigate?.("login")}
              >
                Login
              </button>
            </p>
          </div>
        </div>

        {/* Hero panel */}
        <div
          className="col-lg-6 order-lg-2 d-none d-lg-flex flex-column justify-content-between px-5 py-5"
          style={{
            background: colors.authGreen,
            borderLeft: `2px solid ${colors.greenD}`,
          }}
        >
          <div>
            <p
              className="mb-3 mb-xl-4 text-dark"
              style={{ ...bodyTextStyle, fontSize: "0.8rem", fontWeight: 600 }}
            >
              A Quiet Revolution
            </p>
            <h2
              className="fw-bold text-dark lh-sm mb-0"
              style={{
                fontFamily: fonts.display,
                fontSize: "clamp(2rem, 3vw, 2.8rem)",
                maxWidth: 420,
              }}
            >
              Every saved plate is a small kindness.
            </h2>
            <p
              className="mt-3 mb-0 text-dark"
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

          <div className="d-flex align-items-center justify-content-center flex-grow-1 py-4 px-3">
            <div
              className="w-100 d-flex align-items-center justify-content-center p-4 p-xl-5 signup-illustration"
              style={{
                ...illustrationFrameStyle,
                maxWidth: 380,
                maxHeight: 480,
                boxShadow: "0 0px 10px rgba(0,0,0, 0.15)",
              }}
            >
              <img
                draggable="false"
                src="/images/signup-characters.png"
                alt="3d characters illustration"
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
      </div>
    </div>
  );
}
