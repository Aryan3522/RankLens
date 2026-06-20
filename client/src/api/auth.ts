import { customFetch } from "./custom-fetch";

const TOKEN_KEY = "ranklens_token";

export interface User {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: "user" | "admin";
  plan: "free" | "pro" | "enterprise";
  plan_expires_at: string | null;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}

export function isAdmin(): boolean {
  try {
    const token = getStoredToken();
    if (!token) return false;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function getCurrentUserFromToken(): { sub: string; email: string; role: string; plan: string } | null {
  try {
    const token = getStoredToken();
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export async function register(email: string, password: string, name: string, username?: string): Promise<AuthResponse> {
  return customFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, username }),
    headers: { "Content-Type": "application/json" },
  });
}

export async function login(loginId: string, password: string): Promise<AuthResponse> {
  return customFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ login: loginId, password }),
    headers: { "Content-Type": "application/json" },
  });
}

export async function updateProfile(data: { name?: string; username?: string }): Promise<{ user: User; token: string }> {
  return customFetch("/api/profile", {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean }> {
  return customFetch("/api/profile/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
    headers: { "Content-Type": "application/json" },
  });
}

export async function getMe(): Promise<User> {
  return customFetch<User>("/api/auth/me");
}
