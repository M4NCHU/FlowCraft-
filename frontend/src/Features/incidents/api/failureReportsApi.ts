import { apiGet, apiPost, apiPut } from "../../../shared/api/httpClient";
import type {
  CreateFailureCauseCategoryRequest,
  CreateFailureReportRequest,
  FailureAnalyticsDto,
  FailureCauseCategoryDto,
  FailureReportDto,
  SetFailureReportStatusRequest,
  UpdateFailureCauseCategoryRequest,
  UpdateFailureReportRequest,
} from "./contracts";

export interface FailureReportsListParams {
  openOnly?: boolean;
  signal?: AbortSignal;
}

export const failureReportsApi = {
  list: ({ openOnly = false, signal }: FailureReportsListParams = {}) =>
    apiGet<FailureReportDto[]>("/api/failurereports", {
      signal,
      withAuth: true,
      query: { openOnly },
    }),

  getById: (reportId: string, signal?: AbortSignal) =>
    apiGet<FailureReportDto>(`/api/failurereports/${reportId}`, {
      signal,
      withAuth: true,
    }),

  getAnalytics: (signal?: AbortSignal) =>
    apiGet<FailureAnalyticsDto>("/api/failurereports/analytics", {
      signal,
      withAuth: true,
    }),

  listCauseCategories: (includeInactive = false, signal?: AbortSignal) =>
    apiGet<FailureCauseCategoryDto[]>("/api/failurereports/cause-categories", {
      signal,
      withAuth: true,
      query: { includeInactive },
    }),

  createCauseCategory: (
    body: CreateFailureCauseCategoryRequest,
    signal?: AbortSignal
  ) =>
    apiPost<FailureCauseCategoryDto, CreateFailureCauseCategoryRequest>(
      "/api/failurereports/cause-categories",
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Kategoria przyczyny została dodana.",
      }
    ),

  updateCauseCategory: (
    categoryId: string,
    body: UpdateFailureCauseCategoryRequest,
    signal?: AbortSignal
  ) =>
    apiPut<FailureCauseCategoryDto, UpdateFailureCauseCategoryRequest>(
      `/api/failurereports/cause-categories/${categoryId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Kategoria przyczyny została zaktualizowana.",
      }
    ),

  create: (body: CreateFailureReportRequest, signal?: AbortSignal) =>
    apiPost<FailureReportDto, CreateFailureReportRequest>(
      "/api/failurereports",
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Zgłoszenie awarii zostało utworzone.",
      }
    ),

  update: (
    reportId: string,
    body: UpdateFailureReportRequest,
    signal?: AbortSignal
  ) =>
    apiPut<FailureReportDto, UpdateFailureReportRequest>(
      `/api/failurereports/${reportId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Zgłoszenie awarii zostało zaktualizowane.",
      }
    ),

  setStatus: (
    reportId: string,
    body: SetFailureReportStatusRequest,
    signal?: AbortSignal
  ) =>
    apiPut<FailureReportDto, SetFailureReportStatusRequest>(
      `/api/failurereports/${reportId}/status`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Status awarii został zaktualizowany.",
      }
    ),
};
