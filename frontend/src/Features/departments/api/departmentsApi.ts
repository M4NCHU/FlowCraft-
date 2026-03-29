import { apiGet, apiPost, apiPut } from "../../../shared/api/httpClient";
import type {
  CreateDepartmentRequest,
  DepartmentDto,
  UpdateDepartmentRequest,
} from "./contracts";

export interface DepartmentsListParams {
  includeInactive?: boolean;
  signal?: AbortSignal;
}

export const departmentsApi = {
  list: ({ includeInactive = false, signal }: DepartmentsListParams = {}) =>
    apiGet<DepartmentDto[]>("/api/departments", {
      signal,
      withAuth: true,
      query: { includeInactive },
    }),

  getById: (departmentId: string, signal?: AbortSignal) =>
    apiGet<DepartmentDto>(`/api/departments/${departmentId}`, {
      signal,
      withAuth: true,
    }),

  create: (body: CreateDepartmentRequest, signal?: AbortSignal) =>
    apiPost<DepartmentDto, CreateDepartmentRequest>("/api/departments", body, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Dział został utworzony.",
    }),

  update: (
    departmentId: string,
    body: UpdateDepartmentRequest,
    signal?: AbortSignal
  ) =>
    apiPut<DepartmentDto, UpdateDepartmentRequest>(
      `/api/departments/${departmentId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Dział został zaktualizowany.",
      }
    ),
};
