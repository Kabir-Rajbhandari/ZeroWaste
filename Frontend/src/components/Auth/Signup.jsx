// src/components/Auth/Signup.jsx
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { colors, fonts } from '../../theme';

const SPRING_BOOT_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const INITIAL = { fullName: '', email: '', password: '', confirmPassword: '' };

const cardStyle = {
  maxWidth: 1100,
  minHeight: 'min(880px, calc(100vh - 2.5rem))',
  borderRadius: 14,
  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
};

const illustrationFrameStyle = {
  background: colors.authIllustrationBg,
  borderRadius: 48,
  boxShadow: '0 8px 28px rgba(61, 140, 49, 0.12)',
  maxWidth: 440,
  width: '100%',
};

export default function Signup({ onNavigate }) {
  const [form, setForm] = useState(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.email.includes('@')) return 'Enter a valid email address.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setErrMsg(validationError);
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrMsg('');
    try {
      const res = await fetch(`${SPRING_BOOT_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Registration failed. Please try again.');
      }

      const data = await res.json();
      sessionStorage.setItem('zw_token', data.token);
      sessionStorage.setItem('zw_user', JSON.stringify(data.user));
      setForm(INITIAL);
      onNavigate?.('dashboard');
    } catch (err) {
      setErrMsg(err.message || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3 p-md-4"
      style={{ background: colors.authBg }}
    >
      <div className="row g-0 w-100 overflow-hidden align-items-stretch" style={cardStyle}>
        {/* Form panel */}
        <div
          className="col-12 col-lg-6 order-lg-1 d-flex align-items-center justify-content-center px-4 px-xl-5 py-4 py-xl-5 border-end border-2 h-100"
          style={{ background: colors.authBg, borderColor: colors.authGreen }}
        >
          <div className="w-100" style={{ maxWidth: 380 }}>
            <button
              type="button"
              className="btn btn-link p-0 border-0 text-dark text-decoration-underline mb-4 mb-xl-5"
              style={{ fontSize: '0.8rem', textDecorationColor: colors.authGreen }}
              onClick={() => onNavigate?.('home')}
            >
              ← Back to home
            </button>

            <div className="text-center mb-4 mb-xl-5">
              <img
                src="/images/zerowaste-logo.png"
                alt="ZeroWaste"
                className="img-fluid"
                style={{ width: 200 }}
              />
            </div>

            <h1
              className="text-center fw-bold text-dark mb-2"
              style={{ fontSize: '1.35rem' }}
            >
              Create your account
            </h1>
            <p
              className="text-center text-dark mb-4 mb-xl-5"
              style={{ fontSize: '0.875rem' }}
            >
              Start reducing food waste in under a minute.
            </p>

            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              {status === 'error' && (
                <div className="alert alert-danger py-2 mb-0" style={{ fontSize: '0.85rem' }}>
                  {errMsg}
                </div>
              )}

              <div>
                <label
                  htmlFor="fullName"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: '0.875rem' }}
                >
                  Full Name:
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className="form-control bg-secondary bg-opacity-25 border-dark rounded-2 py-2"
                  placeholder="John Doe"
                  style={{ fontSize: '0.9rem' }}
                  value={form.fullName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: '0.875rem' }}
                >
                  Email:
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-control bg-secondary bg-opacity-25 border-dark rounded-2 py-2"
                  placeholder="someone@gmail.com"
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: '0.875rem' }}
                >
                  Password:
                </label>
                <div className="position-relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-control bg-secondary bg-opacity-25 border-dark rounded-2 py-2 pe-5"
                    style={{ fontSize: '0.9rem' }}
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y p-0 me-3 border-0 text-secondary"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="form-label fw-medium text-dark mb-1"
                  style={{ fontSize: '0.875rem' }}
                >
                  Confirm Password:
                </label>
                <div className="position-relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control bg-secondary bg-opacity-25 border-dark rounded-2 py-2 pe-5"
                    style={{ fontSize: '0.9rem' }}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-link position-absolute top-50 end-0 translate-middle-y p-0 me-3 border-0 text-secondary"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn w-100 text-white fw-semibold rounded-2 py-2 mt-1"
                style={{ background: colors.authGreen, borderColor: colors.authGreen, fontSize: '0.95rem' }}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Creating account…' : 'Register'}
              </button>

              <p className="text-center text-dark mb-0" style={{ fontSize: '0.75rem', lineHeight: 1.6 }}>
                By signing up you agree to our{' '}
                <a href="#" className="text-dark text-decoration-underline">
                  terms &amp; privacy policy
                </a>
                .
              </p>
            </form>

            <p className="text-center text-dark mt-4 mb-0" style={{ fontSize: '0.875rem' }}>
              Already have an account?{' '}
              <button
                type="button"
                className="btn btn-link p-0 border-0 text-dark text-decoration-underline"
                style={{ fontSize: 'inherit' }}
                onClick={() => onNavigate?.('login')}
              >
                Login
              </button>
            </p>
          </div>
        </div>

        {/* Hero panel */}
        <div
          className="col-lg-6 order-lg-2 d-none d-lg-flex flex-column justify-content-between px-4 px-xl-5 py-4 py-xl-5 h-100"
          style={{ background: colors.authBg }}
        >
          <div>
            <p className="mb-3 mb-xl-4 text-dark" style={{ fontSize: '0.75rem' }}>
              A Quiet Revolution
            </p>
            <h2
              className="fw-bold text-dark lh-sm mb-0"
              style={{
                fontFamily: fonts.display,
                fontSize: 'clamp(1.85rem, 3vw, 2.55rem)',
                maxWidth: 400,
              }}
            >
              Every saved plate is a small kindness.
            </h2>
            <p
              className="mt-3 mb-0 text-dark"
              style={{ fontSize: '1rem', maxWidth: 360, lineHeight: 1.65 }}
            >
              Join thousands of households turning surplus into shared meals.
            </p>
          </div>

          <div className="d-flex align-items-center justify-content-center flex-grow-1 py-4 px-3">
            <div
              className="d-flex align-items-center justify-content-center p-4 p-xl-5 mx-auto"
              style={illustrationFrameStyle}
            >
              <img
                src="/images/signup-characters.png"
                alt=""
                className="img-fluid d-block mx-auto"
                style={{ maxWidth: 380 }}
              />
            </div>
          </div>

          <p className="text-center text-muted mb-0" style={{ fontSize: '0.72rem' }}>
            © 2026 ZeroWaste Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
