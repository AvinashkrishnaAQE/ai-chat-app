import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isBootstrapped: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setBootstrapped: () => void;
}

// Deliberately NOT persisted — see the token-storage rationale.
// Access token lives in memory only; session survival across reloads
// comes from the httpOnly refresh cookie + silent /auth/refresh call.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isBootstrapped: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  setBootstrapped: () => set({ isBootstrapped: true }),
}));