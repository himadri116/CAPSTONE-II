import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./authContext";
import type { AuthContextValue } from "./authContext";
import {
  fetchCurrentUser,
  isAuthUnauthorized,
  loginUser,
  loginWithGoogleCredential,
  registerUser,
} from "../services/authApi";
import type { AuthResponse, AuthUser } from "../types/auth";

const TOKEN_KEY = "sdp_auth_token";
const USER_KEY = "sdp_auth_user";

const readStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const readStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

const storeSession = (token: string, user: AuthUser) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Storage can be unavailable (private mode). The session then lasts until reload.
  }
};

const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Nothing to clear.
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);
  // While a saved session is being checked with the server, protected pages wait.
  const [loading, setLoading] = useState<boolean>(() => Boolean(readStoredToken()));

  useEffect(() => {
    const savedToken = readStoredToken();
    if (!savedToken) {
      return;
    }

    let cancelled = false;

    fetchCurrentUser(savedToken)
      .then((freshUser) => {
        if (cancelled) return;
        setUser(freshUser);
        storeSession(savedToken, freshUser);
      })
      .catch((error) => {
        if (cancelled) return;
        // Only drop the session when the server says it is invalid.
        // A network error keeps the saved login so a restart does not log people out.
        if (isAuthUnauthorized(error)) {
          clearSession();
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const completeAuth = useCallback((response: AuthResponse) => {
    storeSession(response.token, response.user);
    setToken(response.token);
    setUser(response.user);
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      completeAuth(await loginUser(email, password));
    },
    [completeAuth]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      completeAuth(await registerUser(name, email, password));
    },
    [completeAuth]
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      completeAuth(await loginWithGoogleCredential(credential));
    },
    [completeAuth]
  );

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login, register, loginWithGoogle, completeAuth, logout }),
    [user, token, loading, login, register, loginWithGoogle, completeAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
