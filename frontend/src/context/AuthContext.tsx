import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import type { UserProfile, AuthResponse, SendOtpResponse } from "../types/auth";
import { API_BASE_URL } from "../services/api";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  googleClientId: string;
  devAuth: boolean;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; message: string }>;
  sendOtp: (email: string) => Promise<SendOtpResponse>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  loginAsDemo: () => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("bugsight_token"));
  const [loading, setLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState("");
  const [devAuth, setDevAuth] = useState(true);

  // Load auth config (Google client ID, dev mode)
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/auth/config`)
      .then((res) => {
        if (res.data.google_client_id) {
          setGoogleClientId(res.data.google_client_id);
        }
        if (typeof res.data.dev_auth === "boolean") {
          setDevAuth(res.data.dev_auth);
        }
      })
      .catch((err) => {
        console.warn("Failed to load auth config:", err);
      });
  }, []);

  // Fetch current user if token exists
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    axios
      .get<UserProfile>(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then((res) => {
        setUser(res.data);
      })
      .catch((err) => {
        console.warn("Session expired or invalid:", err);
        localStorage.removeItem("bugsight_token");
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const saveAuth = (authRes: AuthResponse) => {
    setUser(authRes.user);
    setToken(authRes.token);
    localStorage.setItem("bugsight_token", authRes.token);
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const res = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/google`, {
        credential
      });
      saveAuth(res.data);
      return { success: true, message: res.data.message };
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Google authentication failed";
      return { success: false, message: msg };
    }
  };

  const sendOtp = async (email: string): Promise<SendOtpResponse> => {
    try {
      const res = await axios.post<SendOtpResponse>(`${API_BASE_URL}/api/auth/otp/send`, {
        email
      });
      return res.data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to send verification code";
      return { success: false, message: msg };
    }
  };

  const verifyOtp = async (email: string, otp: string) => {
    try {
      const res = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/otp/verify`, {
        email,
        otp
      });
      saveAuth(res.data);
      return { success: true, message: res.data.message };
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Invalid verification code";
      return { success: false, message: msg };
    }
  };

  const loginAsDemo = async () => {
    try {
      const res = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/demo`);
      saveAuth(res.data);
      return { success: true, message: res.data.message };
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Demo login failed";
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem("bugsight_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        googleClientId,
        devAuth,
        loginWithGoogle,
        sendOtp,
        verifyOtp,
        loginAsDemo,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
