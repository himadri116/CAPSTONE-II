<<<<<<< HEAD
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoUrl from "../../assets/logo.png";
import "../styles/login-page.css";

function LoginPage() {
  const { user, loginWithGoogle, sendOtp, verifyOtp, loginAsDemo, googleClientId, devAuth } = useAuth();
=======
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../hooks/useAuth";
import { getAuthErrorMessage } from "../services/authApi";
import { isGoogleConfigured } from "../utils/googleAuth";

function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth();
>>>>>>> origin/tanvi
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
<<<<<<< HEAD
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [devCode, setDevCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // If already logged in, redirect
  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  // Load Google Identity Services script if client ID is set
  useEffect(() => {
    if (!googleClientId) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setLoading(true);
              setError(null);
              const res = await loginWithGoogle(response.credential);
              setLoading(false);
              if (!res.success) {
                setError(res.message);
              }
            }
          }
        });

        const target = document.getElementById("googleSignInBtn");
        if (target) {
          (window as any).google.accounts.id.renderButton(target, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "continue_with"
          });
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [googleClientId]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const res = await sendOtp(email);
    setLoading(false);

    if (res.success) {
      setStep("otp");
      setSuccess("A 6-digit one-time password has been sent to your email.");
      if (res.dev_otp) {
        setDevCode(res.dev_otp);
      }
    } else {
      setError(res.message);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit OTP code");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await verifyOtp(email, otp);
    setLoading(false);

    if (!res.success) {
      setError(res.message);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    const res = await loginAsDemo();
    setLoading(false);
    if (!res.success) {
      setError(res.message);
=======
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
    "/repository-input";

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not log you in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setError("");
    try {
      await loginWithGoogle(credential);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not sign you in with Google."));
>>>>>>> origin/tanvi
    }
  };

  return (
<<<<<<< HEAD
    <div className="login-page-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-wrap">
            <img src={logoUrl} alt="BugSight Logo" className="login-logo" />
          </div>
          <h1>Welcome to BugSight</h1>
          <p className="login-subtitle">
            Sign in with Google or Email OTP to save prediction reports and analyze repositories
          </p>
        </div>

        {error && <div className="login-alert error">{error}</div>}
        {success && <div className="login-alert success">{success}</div>}

        {/* Google Authentication Section */}
        <div className="auth-section">
          {googleClientId ? (
            <div id="googleSignInBtn" className="google-btn-container"></div>
          ) : (
            <button
              type="button"
              className="google-custom-btn"
              onClick={() => {
                setError(
                  "To activate Google OAuth, set GOOGLE_CLIENT_ID in your environment or use Email OTP / Demo Login below."
                );
              }}
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          )}
        </div>

        <div className="login-divider">
          <span>OR CONTINUE WITH EMAIL</span>
        </div>

        {/* Email OTP Section */}
        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="login-input"
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Sending One-Time Password..." : "Send Verification Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="otp-step-header">
              <p>
                Enter the 6-digit code sent to <strong>{email}</strong>
              </p>
              <button
                type="button"
                className="change-email-btn"
                onClick={() => {
                  setStep("email");
                  setDevCode(null);
                  setError(null);
                }}
              >
                Change Email
              </button>
            </div>

            {devCode && (
              <div className="dev-otp-banner">
                <span>Test Code: <strong>{devCode}</strong></span>
                <button
                  type="button"
                  className="dev-fill-btn"
                  onClick={() => setOtp(devCode)}
                >
                  Auto-fill
                </button>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="login-otp">One-Time Password (OTP)</label>
              <input
                id="login-otp"
                type="text"
                placeholder="• • • • • •"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                disabled={loading}
                className="login-input otp-input"
              />
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
          </form>
        )}

        {/* Demo Login Option */}
        {devAuth && (
          <div className="demo-login-section">
            <div className="demo-divider">
              <span>FOR EVALUATION & TESTING</span>
            </div>
            <button
              type="button"
              className="demo-login-btn"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              ⚡ Continue as Demo Reviewer
            </button>
          </div>
        )}
      </div>
    </div>
=======
    <AuthLayout title="Log in" subtitle="Welcome back. Log in to scan repositories and see your history.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <div className="auth-label-row">
          <label htmlFor="login-password">Password</label>
          <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
        </div>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && <div className="error-box" role="alert">{error}</div>}

        <button type="submit" className="primary-button full-width" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      {isGoogleConfigured && (
        <>
          <div className="auth-divider"><span>or</span></div>
          <GoogleSignInButton onCredential={handleGoogle} onError={setError} />
        </>
      )}

      <p className="auth-switch">
        New here? <Link to="/signup" className="auth-link">Create an account</Link>
      </p>
    </AuthLayout>
>>>>>>> origin/tanvi
  );
}

export default LoginPage;
