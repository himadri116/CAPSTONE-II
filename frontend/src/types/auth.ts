export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  authProvider?: "local" | "google" | "otp" | "demo";
  auth_provider?: "local" | "google" | "otp" | "demo";
}

export type UserProfile = AuthUser;

export interface AuthResponse {
  token: string;
  user: AuthUser;
  message?: string;
}

export interface MessageResponse {
  message: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  dev_otp?: string;
}
