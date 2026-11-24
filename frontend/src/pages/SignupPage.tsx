import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../hooks/useAuth";
import { getAuthErrorMessage } from "../services/authApi";
import { isGoogleConfigured } from "../utils/googleAuth";

function SignupPage() {
  const { user, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not create your account. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setError("");
    try {
      await loginWithGoogle(credential);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not sign you in with Google."));
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Sign up to scan repositories and keep your prediction history.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="signup-name">Name</label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="signup-password-hint"
          required
        />
        <span id="signup-password-hint" className="auth-hint">At least 8 characters.</span>

        <label htmlFor="signup-confirm">Confirm password</label>
        <input
          id="signup-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        {error && <div className="error-box" role="alert">{error}</div>}

        <button type="submit" className="primary-button full-width" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      {isGoogleConfigured && (
        <>
          <div className="auth-divider"><span>or</span></div>
          <GoogleSignInButton onCredential={handleGoogle} onError={setError} />
        </>
      )}

      <p className="auth-switch">
        Already have an account? <Link to="/login" className="auth-link">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export default SignupPage;
