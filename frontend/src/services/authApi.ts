import axios from "axios";
import type { AuthResponse, AuthUser, MessageResponse } from "../types/auth";

// The Express + MongoDB auth server (separate from the FastAPI prediction backend).
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "http://localhost:5000";

const authClient = axios.create({ baseURL: `${AUTH_API_URL}/api/auth` });

export const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach the login server. Check that it is running and try again.";
    }

    const message = error.response.data?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
};

export const registerUser = async (
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await authClient.post<AuthResponse>("/register", {
    name,
    email,
    password,
  });
  return response.data;
};

export const loginUser = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const response = await authClient.post<AuthResponse>("/login", {
    email,
    password,
  });
  return response.data;
};

export const loginWithGoogleCredential = async (
  credential: string
): Promise<AuthResponse> => {
  const response = await authClient.post<AuthResponse>("/google", { credential });
  return response.data;
};

export const fetchCurrentUser = async (authToken: string): Promise<AuthUser> => {
  const response = await authClient.get<{ user: AuthUser }>("/me", {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data.user;
};

export const requestPasswordReset = async (
  email: string
): Promise<MessageResponse> => {
  const response = await authClient.post<MessageResponse>("/forgot-password", {
    email,
  });
  return response.data;
};

export const resetPasswordWithToken = async (
  resetToken: string,
  password: string
): Promise<AuthResponse> => {
  const response = await authClient.post<AuthResponse>(
    `/reset-password/${encodeURIComponent(resetToken)}`,
    { password }
  );
  return response.data;
};

export const isAuthUnauthorized = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 401;
