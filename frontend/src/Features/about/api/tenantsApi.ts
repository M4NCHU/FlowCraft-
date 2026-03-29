import { apiGet, apiPost, apiPut } from "../../../shared/api/httpClient";
import type { TenantDto } from "../types";
import type { CreateTenantRequest, UpdateTenantRequest } from "./contracts";

export const tenantsApi = {
  getAll: (signal?: AbortSignal) =>
    apiGet<TenantDto[]>("/api/tenants", {
      signal,
      withAuth: true,
    }),

  getMe: (signal?: AbortSignal) =>
    apiGet<TenantDto>("/api/tenants/me", {
      signal,
      withAuth: true,
      notifyOnError: false,
    }),

  updateMe: (body: UpdateTenantRequest, signal?: AbortSignal) =>
    apiPut<TenantDto, UpdateTenantRequest>("/api/tenants/me", body, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Dane tenanta zostały zapisane.",
    }),

  getById: (tenantId: string, signal?: AbortSignal) =>
    apiGet<TenantDto>(`/api/tenants/${tenantId}`, {
      signal,
      withAuth: true,
    }),

  create: (body: CreateTenantRequest, signal?: AbortSignal) =>
    apiPost<TenantDto, CreateTenantRequest>("/api/tenants", body, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Tenant został utworzony.",
    }),
};
