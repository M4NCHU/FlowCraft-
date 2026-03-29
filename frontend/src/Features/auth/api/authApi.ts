import { apiGet, apiPost } from "../../../shared/api/httpClient";
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
} from "./contracts";

export const authApi = {
  getMe: (signal?: AbortSignal) =>
    apiGet<MeResponse>("/api/auth/me", {
      signal,
      withAuth: true,
      notifyOnError: false,
    }),

  login: (body: LoginRequest, signal?: AbortSignal) =>
    apiPost<LoginResponse, LoginRequest>("/api/auth/login", body, {
      signal,
      withAuth: false,
      notifyOnError: true,
      notifyOnSuccess: true,
      successMessage: "Zalogowano pomysłnie.",
    }),

  logout: (signal?: AbortSignal) =>
    apiPost<void, undefined>("/api/auth/logout", undefined, {
      signal,
      withAuth: true,
      responseType: "void",
      notifyOnSuccess: true,
      successMessage: "Wylogowano pomysłnie.",
    }),

  register: (body: RegisterRequest, signal?: AbortSignal) =>
    apiPost<RegisterResponse, RegisterRequest>("/api/auth/register", body, {
      signal,
      withAuth: false,
      notifyOnSuccess: true,
      successMessage: "Konto zostało utworzone.",
    }),
};
