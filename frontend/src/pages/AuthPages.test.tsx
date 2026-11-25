import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthProvider";
import type { AuthResponse } from "../types/auth";
import LoginPage from "./LoginPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import ResetPasswordPage from "./ResetPasswordPage";
import {
  loginUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from "../services/authApi";

vi.mock("../services/authApi", () => ({
  fetchCurrentUser: vi.fn(),
  getAuthErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback),
  isAuthUnauthorized: vi.fn(),
  loginUser: vi.fn(),
  loginWithGoogleCredential: vi.fn(),
  registerUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPasswordWithToken: vi.fn(),
}));

vi.mock("../utils/googleAuth", () => ({ isGoogleConfigured: false }));

const authResponse: AuthResponse = {
  token: "unit-test-token",
  user: {
    id: "unit-test-user",
    name: "Test User",
    email: "tester@example.com",
    authProvider: "local",
  },
};

const renderAuthPage = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/repository-input" element={<p>Repository scanner page</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe("authentication pages", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("logs in, stores the session, and opens the scanner", async () => {
    const user = userEvent.setup();
    vi.mocked(loginUser).mockResolvedValue(authResponse);
    renderAuthPage("/login");

    await user.type(screen.getByLabelText("Email"), authResponse.user.email);
    await user.type(screen.getByLabelText("Password"), "Test-pass-123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Repository scanner page")).toBeInTheDocument();
    expect(loginUser).toHaveBeenCalledWith(authResponse.user.email, "Test-pass-123");
    expect(localStorage.getItem("sdp_auth_token")).toBe(authResponse.token);
  });

  it("shows a clear error when login is rejected", async () => {
    const user = userEvent.setup();
    vi.mocked(loginUser).mockRejectedValue(new Error("invalid credentials"));
    renderAuthPage("/login");

    await user.type(screen.getByLabelText("Email"), "tester@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Login failed. Check your credentials."
    );
    expect(localStorage.getItem("sdp_auth_token")).toBeNull();
  });

  it("shows the privacy-preserving password reset confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(requestPasswordReset).mockResolvedValue({
      message: "If the account exists, an email was sent.",
    });
    renderAuthPage("/forgot-password");

    await user.type(screen.getByLabelText("Email"), "tester@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "If an account exists for tester@example.com"
    );
    expect(requestPasswordReset).toHaveBeenCalledWith("tester@example.com");
  });

  it("rejects a short or mismatched reset password before calling the API", async () => {
    const user = userEvent.setup();
    renderAuthPage("/reset-password/test-reset-token");

    await user.type(screen.getByLabelText("New password"), "short");
    await user.type(screen.getByLabelText("Confirm new password"), "short");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Password must be at least 8 characters."
    );
    expect(resetPasswordWithToken).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("New password"));
    await user.clear(screen.getByLabelText("Confirm new password"));
    await user.type(screen.getByLabelText("New password"), "Test-pass-123");
    await user.type(screen.getByLabelText("Confirm new password"), "Other-pass-123");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The two passwords do not match."
    );
    expect(resetPasswordWithToken).not.toHaveBeenCalled();
  });

  it("completes password reset with the URL token and stores the new session", async () => {
    const user = userEvent.setup();
    vi.mocked(resetPasswordWithToken).mockResolvedValue(authResponse);
    renderAuthPage("/reset-password/test-reset-token");

    await user.type(screen.getByLabelText("New password"), "Test-pass-123");
    await user.type(screen.getByLabelText("Confirm new password"), "Test-pass-123");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(await screen.findByRole("heading", { name: "Password updated" })).toBeInTheDocument();
    expect(resetPasswordWithToken).toHaveBeenCalledWith(
      "test-reset-token",
      "Test-pass-123"
    );
    expect(localStorage.getItem("sdp_auth_token")).toBe(authResponse.token);
  });
});
