// src/components/Auth/Login.jsx
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { colors, fonts } from "../../theme";

const SPRING_BOOT_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const cardStyle = {
  maxWidth: 1350,
  minHeight: "min(860px, calc(100vh - 3rem))",
  borderRadius: 20,
  boxShadow: "0 0px 12px rgba(0, 0, 0, 0.20)",
  overflow: "hidden",
};

const illustrationFrameStyle = {
  background: colors.authIllustrationBg,
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
  const [form, setForm] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");
  const [fieldErrors, setFieldErrors] = useState({});
  const [errMsg, setErrMsg] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validate = () => {
    const errors = {};
    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!form.email.includes("@"))
      errors.email = "Enter a valid email address.";
    if (!form.password) errors.password = "Password is required.";
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
      const res = await fetch(`${SPRING_BOOT_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Invalid email or password.");
      }

      const data = await res.json();
      sessionStorage.setItem("zw_token", data.token);
      sessionStorage.setItem("zw_user", JSON.stringify(data.user));
      onNavigate?.("dashboard");
    } catch (err) {
      setErrMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-5"
      style={{ background: colors.authBg }}
    >
      <div
        className="login-card row g-0 w-100"
        style={{
          ...cardStyle,
          minHeight: "min(860px, calc(100vh - 3rem))",
          height: "auto",
        }}
      >
        <style>{`
        
          .login-illustration {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .login-illustration:hover {
            transform: translateY(-4px);
            box-shadow: 0 14px 34px rgba(61, 140, 49, 0.18);
          }

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
            background: ${colors.authGreen};
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
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
          }

          .login-input:focus {
            border-color: ${colors.authGreen};
            outline: none;
          }

          .create-account-btn:hover {
            border-bottom: 1px solid ${colors.authGreen};
          }
        `}</style>
        <div
          className="col-lg-6 d-none d-lg-flex flex-column justify-content-between px-5 py-5"
          style={{
            background: colors.registerBG,
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
                boxShadow: "0 0px 20px rgba(0,0,0, 0.25)",
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
            background: colors.registerBG,
            minHeight: "100%",
            borderLeft: `2px solid ${colors.authGreen}`,
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
                src="/images/ZeroWaste_logo_transparent_bg.png"
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
              {errMsg && !Object.keys(fieldErrors).length && (
                <div
                  className="alert alert-danger py-2 mb-0"
                  style={{ fontSize: "0.9rem" }}
                >
                  {errMsg}
                </div>
              )}

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
                  value={form.email}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.email && (
                  <p className="text-danger small mt-2 mb-0">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

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
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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

              <button
                type="submit"
                className="btn w-100 text-white fw-bold text-uppercase rounded-3 py-2 login-btn"
                style={{
                  ...bodyTextStyle,
                  height: "3.5rem",
                  opacity: "0.75",
                  background: colors.authGreen,
                  fontSize: "0.95rem",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  transition:
                    "background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease",
                }}
                disabled={status === "loading"}
              >
                Login
              </button>
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
                  color: colors.authGreen,
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