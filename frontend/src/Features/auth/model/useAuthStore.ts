import { create } from "zustand";
import { authApi } from "../api/authApi";

interface AuthState {
  isAuthenticated: boolean;
  isChecking: boolean;
  initialize: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isChecking: false,
  async initialize() {
    set({ isChecking: true });
    try {
      await authApi.getMe();
      set({ isAuthenticated: true, isChecking: false });
    } catch {
      set({ isAuthenticated: false, isChecking: false });
    }
  },
  setAuthenticated(value) {
    set({ isAuthenticated: value });
  },
}));
