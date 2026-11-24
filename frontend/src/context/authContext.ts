import { createContext } from "react";
import type { AuthResponse, AuthUser } from "../types/auth";

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  completeAuth: (response: AuthResponse) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
