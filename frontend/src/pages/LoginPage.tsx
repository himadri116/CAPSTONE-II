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
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

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
    }
  };

  return (
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
  );
}

export default LoginPage;
