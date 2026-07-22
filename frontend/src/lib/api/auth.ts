import { apiRequest } from "./client";

export async function registerRequest(email: string, password: string, fullName?: string) {
  const res = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, full_name: fullName ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed." }));
    throw new Error(err.detail);
  }
  return res.json();
}

export async function loginRequest(email: string, password: string) {
  const res = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed." }));
    throw new Error(err.detail);
  }
  return res.json();
}

export async function logoutRequest() {
  await apiRequest("/auth/logout", { method: "POST" });
}