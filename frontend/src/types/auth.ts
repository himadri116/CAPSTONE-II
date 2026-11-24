export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  authProvider: "local" | "google";
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface MessageResponse {
  message: string;
}
