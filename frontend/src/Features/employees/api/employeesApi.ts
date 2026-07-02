import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../../../shared/api/httpClient";
import type {
  CreateEmployeeRequest,
  EmployeeDto,
  EmployeeSkillDto,
  ReplaceEmployeeSkillsRequest,
  UpdateEmployeeRequest,
} from "./contracts";

export interface EmployeesListParams {
  includeInactive?: boolean;
  signal?: AbortSignal;
}

export const employeesApi = {
  list: ({ includeInactive = false, signal }: EmployeesListParams = {}) =>
    apiGet<EmployeeDto[]>("/api/employees", {
      signal,
      withAuth: true,
      query: { includeInactive },
    }),

  getById: (employeeId: string, signal?: AbortSignal) =>
    apiGet<EmployeeDto>(`/api/employees/${employeeId}`, {
      signal,
      withAuth: true,
    }),

  create: (body: CreateEmployeeRequest, signal?: AbortSignal) =>
    apiPost<EmployeeDto, CreateEmployeeRequest>("/api/employees", body, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Pracownik został utworzony.",
    }),

  update: (
    employeeId: string,
    body: UpdateEmployeeRequest,
    signal?: AbortSignal
  ) =>
    apiPut<EmployeeDto, UpdateEmployeeRequest>(
      `/api/employees/${employeeId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Pracownik został zaktualizowany.",
      }
    ),

  delete: (employeeId: string, signal?: AbortSignal) =>
    apiDelete<void>(`/api/employees/${employeeId}`, {
      signal,
      withAuth: true,
      responseType: "void",
      notifyOnSuccess: true,
      successMessage: "Pracownik został dezaktywowany.",
    }),

  replaceSkills: (
    employeeId: string,
    body: ReplaceEmployeeSkillsRequest,
    signal?: AbortSignal
  ) =>
    apiPut<EmployeeSkillDto[], ReplaceEmployeeSkillsRequest>(
      `/api/employees/${employeeId}/skills`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Uprawnienia pracownika zostaly zaktualizowane.",
      }
    ),
};
