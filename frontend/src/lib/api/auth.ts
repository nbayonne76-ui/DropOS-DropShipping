import { apiClient } from "./client";
import type {
  User,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  UpdateMeRequest,
} from "@/types/api";

export async function login(data: LoginRequest): Promise<AuthTokens> {
  // FastAPI OAuth2 expects form-encoded body for token endpoint
  const formData = new URLSearchParams({
    username: data.email,
    password: data.password,
  });

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(
      typeof err.detail === "string" ? err.detail : "Invalid credentials"
    );
  }

  return res.json() as Promise<AuthTokens>;
}

export async function register(data: RegisterRequest): Promise<User> {
  return apiClient.post<User>("/auth/register", data);
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post<void>("/auth/logout");
  } finally {
    apiClient.clearTokenCookies();
  }
}

export async function refreshToken(token: string): Promise<AuthTokens> {
  return apiClient.post<AuthTokens>("/auth/refresh", {
    refresh_token: token,
  });
}

export async function getMe(): Promise<User> {
  return apiClient.get<User>("/auth/me");
}

export async function updateMe(data: UpdateMeRequest): Promise<User> {
  return apiClient.patch<User>("/auth/me", data);
}
