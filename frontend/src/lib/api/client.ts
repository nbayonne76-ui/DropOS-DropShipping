const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ─── Token helpers ────────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getRefreshToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)refresh_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setTokenCookies(access: string, refresh: string): void {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `access_token=${encodeURIComponent(access)}; Path=/${secure}; SameSite=Lax`;
  document.cookie = `refresh_token=${encodeURIComponent(refresh)}; Path=/${secure}; SameSite=Lax`;
}

function clearTokenCookies(): void {
  document.cookie = "access_token=; Path=/; Max-Age=0";
  document.cookie = "refresh_token=; Path=/; Max-Age=0";
}

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    clearTokenCookies();
    window.location.replace("/login");
  }
}

// ─── Token refresh ────────────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) return null;

      const data = (await res.json()) as {
        access_token: string;
        refresh_token: string;
      };
      setTokenCookies(data.access_token, data.refresh_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
  isRetry = false
): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options;

  // Build query string
  let url = `${BASE_URL}/api/v1${path}`;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extraHeaders as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Handle 401 with one refresh+retry
  if (res.status === 401 && !isRetry) {
    const newToken = await attemptTokenRefresh();
    if (newToken) {
      return apiFetch<T>(path, options, true);
    }
    redirectToLogin();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    const err = new Error(
      typeof errorBody.detail === "string"
        ? errorBody.detail
        : "Request failed"
    ) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = errorBody;
    throw err;
  }

  // No content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export { getAccessToken };

export const apiClient = {
  get<T>(path: string, params?: FetchOptions["params"]): Promise<T> {
    return apiFetch<T>(path, { method: "GET", params });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, { method: "POST", body });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, { method: "PATCH", body });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return apiFetch<T>(path, { method: "PUT", body });
  },

  delete<T>(path: string): Promise<T> {
    return apiFetch<T>(path, { method: "DELETE" });
  },

  setTokenCookies,
  clearTokenCookies,
};
