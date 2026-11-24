import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { getAuthErrorMessage, requestPasswordReset } from "../services/authApi";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await requestPasswordReset(email);
      setSentTo(email);
    } catch (err) {
      setError(getAuthErrorMessage(err, "Could not send the reset link. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" subtitle="The reset link expires in 15 minutes.">
        <div className="loading-box" role="status">
          If an account exists for <strong>{sentTo}</strong>, we sent a link to reset the password.
          Check your spam folder if it does not arrive.
        </div>
        <p className="auth-switch">
          <Link to="/login" className="auth-link">Back to log in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we will send you a link to choose a new password.">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        {error && <div className="error-box" role="alert">{error}</div>}

        <button type="submit" className="primary-button full-width" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="auth-switch">
        <Link to="/login" className="auth-link">Back to log in</Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
