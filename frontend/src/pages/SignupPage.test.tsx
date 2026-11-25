import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../context/AuthProvider";
import type { AuthResponse } from "../types/auth";
import SignupPage from "./SignupPage";
import { registerUser } from "../services/authApi";

vi.mock("../services/authApi", () => ({
  fetchCurrentUser: vi.fn(),
  getAuthErrorMessage: vi.fn((_error: unknown, fallback: string) => fallback),
  isAuthUnauthorized: vi.fn(),
  loginUser: vi.fn(),
  loginWithGoogleCredential: vi.fn(),
  registerUser: vi.fn(),
}));

vi.mock("../utils/googleAuth", () => ({ isGoogleConfigured: false }));

const renderSignup = () =>
  render(
    <MemoryRouter initialEntries={["/signup"]}>
      <AuthProvider>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/repository-input"
            element={<p>Repository scanner page</p>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe("SignupPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("rejects passwords shorter than eight characters", async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByLabelText("Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "short@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.type(screen.getByLabelText("Confirm password"), "short");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Password must be at least 8 characters."
    );
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched password confirmation", async () => {
    const user = userEvent.setup();
    renderSignup();

    await user.type(screen.getByLabelText("Name"), "Test User");
    await user.type(screen.getByLabelText("Email"), "mismatch@example.com");
    await user.type(screen.getByLabelText("Password"), "Test-pass-123");
    await user.type(screen.getByLabelText("Confirm password"), "Other-pass-123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The two passwords do not match."
    );
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("stores the returned session and navigates to the scanner after signup", async () => {
    const user = userEvent.setup();
    const authResponse: AuthResponse = {
      token: "unit-test-token",
      user: {
        id: "unit-test-user",
        name: "Test User",
        email: "tester@example.com",
        authProvider: "local",
      },
    };
    vi.mocked(registerUser).mockResolvedValue(authResponse);
    renderSignup();

    await user.type(screen.getByLabelText("Name"), authResponse.user.name);
    await user.type(screen.getByLabelText("Email"), authResponse.user.email);
    await user.type(screen.getByLabelText("Password"), "Test-pass-123");
    await user.type(screen.getByLabelText("Confirm password"), "Test-pass-123");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Repository scanner page")).toBeInTheDocument();
    expect(registerUser).toHaveBeenCalledWith(
      authResponse.user.name,
      authResponse.user.email,
      "Test-pass-123"
    );
    expect(localStorage.getItem("sdp_auth_token")).toBe(authResponse.token);
  });
});
