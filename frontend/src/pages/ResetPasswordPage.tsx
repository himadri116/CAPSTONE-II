import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../hooks/useAuth";
import { getAuthErrorMessage, resetPasswordWithToken } from "../services/authApi";

function ResetPasswordPage() {
  const { token: resetToken = "" } = useParams();
  const { completeAuth } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      completeAuth(await resetPasswordWithToken(resetToken, password));
      setDone(true);
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not reset your password. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You are now logged in with your new password.">
        <Link to="/repository-input" className="primary-button full-width auth-center-button">
          Scan a repository
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="reset-password">New password</label>
        <input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <label htmlFor="reset-confirm">Confirm new password</label>
        <input
          id="reset-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        {error && <div className="error-box" role="alert">{error}</div>}

        <button type="submit" className="primary-button full-width" disabled={submitting}>
          {submitting ? "Saving…" : "Save new password"}
        </button>
      </form>

      <p className="auth-switch">
        Link expired? <Link to="/forgot-password" className="auth-link">Request a new one</Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPasswordPage;
