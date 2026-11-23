export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  auth_provider: "google" | "otp" | "demo";
}

export interface AuthResponse {
  message: string;
  user: UserProfile;
  token: string;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  dev_otp?: string;
}
