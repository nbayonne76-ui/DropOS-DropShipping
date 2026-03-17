import { apiClient } from "./client";
import type {
  User,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  UpdateMeRequest,
} from "@/types/api";

export async function login(data: LoginRequest): Promise<AuthTokens> {
  return apiClient.post<AuthTokens>("/auth/login", data);
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
