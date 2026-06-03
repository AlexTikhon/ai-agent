import { create } from "zustand";
import { api } from "../api/client";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  },
  register: async (email, name, password) => {
    const { data } = await api.post("/auth/register", { email, name, password });
    set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  },
  logout: () => set({ accessToken: null, refreshToken: null })
}));
