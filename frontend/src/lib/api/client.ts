import { useAuthStore } from "@/store/useAuthStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

interface RequestOptions extends RequestInit {
  skipAuthRetry?: boolean;
}

async function rawRequest(path: string, options: RequestOptions = {}) {
  const { accessToken } = useAuthStore.getState();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include", // sends the httpOnly refresh cookie
  });
}

export async function apiRequest(path: string, options: RequestOptions = {}) {
  let res = await rawRequest(path, options);

  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawRequest(path, { ...options, skipAuthRetry: true });
    }
  }

  return res;
}

export async function tryRefresh(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    useAuthStore.getState().clearAuth();
    return false;
  }

  const data = await res.json();
  useAuthStore.getState().setAuth(data.user, data.access_token);
  return true;
}