import { apiGet, apiPost } from "../../../shared/api/httpClient";
import type {
  AssignRoleRequest,
  AssignRoleResponse,
  CreateRoleRequest,
  CreateRoleResponse,
  RoleDto,
  UserRolesResponse,
} from "./rolesContracts";

export const rolesApi = {
  list: (signal?: AbortSignal) =>
    apiGet<RoleDto[]>("/api/roles", {
      signal,
      withAuth: true,
    }),

  create: (body: CreateRoleRequest, signal?: AbortSignal) =>
    apiPost<CreateRoleResponse, CreateRoleRequest>("/api/roles", body, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Rola została utworzona.",
    }),

  assign: (body: AssignRoleRequest, signal?: AbortSignal) =>
    apiPost<AssignRoleResponse, AssignRoleRequest>(
      "/api/roles/assign",
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Rola została przypisana.",
      }
    ),

  getUserRoles: (userId: string, signal?: AbortSignal) =>
    apiGet<UserRolesResponse>(`/api/roles/user/${userId}`, {
      signal,
      withAuth: true,
    }),
};
