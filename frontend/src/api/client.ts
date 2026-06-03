import axios from "axios";
import { useAuthStore } from "../store/auth.store";

// Handles api client setup logic.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api"
});

// Handles authenticated request setup logic.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
