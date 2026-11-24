import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProtectedRoute from "./ProtectedRoute";
import { AuthContext } from "../context/authContext";
import type { AuthContextValue } from "../context/authContext";

const baseContext: AuthContextValue = {
  user: null,
  token: null,
  loading: false,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  completeAuth: () => {},
  logout: () => {},
};

const renderAt = (context: AuthContextValue) =>
  render(
    <AuthContext.Provider value={context}>
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Private content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe("ProtectedRoute", () => {
  it("redirects logged-out visitors to the login page", () => {
    renderAt(baseContext);
    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("shows the page to logged-in users", () => {
    renderAt({
      ...baseContext,
      user: { id: "1", name: "Ada", email: "ada@example.com", avatar: null, authProvider: "local" },
    });
    expect(screen.getByText("Private content")).toBeInTheDocument();
  });

  it("waits while a saved session is being checked", () => {
    renderAt({ ...baseContext, loading: true });
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
  });
});
