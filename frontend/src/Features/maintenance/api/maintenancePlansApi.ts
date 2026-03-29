import { apiGet, apiPost, apiPut } from "../../../shared/api/httpClient";
import type {
  CompleteMaintenanceOccurrenceRequest,
  CreateMaintenancePlanRequest,
  MaintenanceAutomationSyncDto,
  MaintenanceCalendarOccurrenceDto,
  MaintenancePlanDto,
  UpdateMaintenancePlanRequest,
} from "./contracts";

export interface MaintenancePlansListParams {
  assetId?: string;
  includeInactive?: boolean;
  signal?: AbortSignal;
}

export interface MaintenanceCalendarParams {
  fromUtc: string;
  toUtc: string;
  assetId?: string;
  signal?: AbortSignal;
}

export const maintenancePlansApi = {
  list: ({
    assetId,
    includeInactive = false,
    signal,
  }: MaintenancePlansListParams = {}) =>
    apiGet<MaintenancePlanDto[]>("/api/maintenanceplans", {
      signal,
      withAuth: true,
      query: {
        assetId,
        includeInactive,
      },
    }),

  getById: (planId: string, signal?: AbortSignal) =>
    apiGet<MaintenancePlanDto>(`/api/maintenanceplans/${planId}`, {
      signal,
      withAuth: true,
    }),

  getCalendar: ({ fromUtc, toUtc, assetId, signal }: MaintenanceCalendarParams) =>
    apiGet<MaintenanceCalendarOccurrenceDto[]>("/api/maintenanceplans/calendar", {
      signal,
      withAuth: true,
      query: {
        fromUtc,
        toUtc,
        assetId,
      },
    }),

  syncAutoWorkOrders: (assetId?: string, signal?: AbortSignal) =>
    apiPost<MaintenanceAutomationSyncDto, undefined>(
      "/api/maintenanceplans/sync-auto-work-orders",
      undefined,
      {
        signal,
        withAuth: true,
        query: { assetId },
        notifyOnSuccess: false,
      }
    ),

  create: (body: CreateMaintenancePlanRequest, signal?: AbortSignal) =>
    apiPost<MaintenancePlanDto, CreateMaintenancePlanRequest>(
      "/api/maintenanceplans",
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Plan przeglądu został dodany.",
      }
    ),

  update: (
    planId: string,
    body: UpdateMaintenancePlanRequest,
    signal?: AbortSignal
  ) =>
    apiPut<MaintenancePlanDto, UpdateMaintenancePlanRequest>(
      `/api/maintenanceplans/${planId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Plan przeglądu został zaktualizowany.",
      }
    ),

  complete: (
    planId: string,
    body: CompleteMaintenanceOccurrenceRequest,
    signal?: AbortSignal
  ) =>
    apiPost<MaintenancePlanDto, CompleteMaintenanceOccurrenceRequest>(
      `/api/maintenanceplans/${planId}/complete`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Przegląd został oznaczony jako wykonany.",
      }
    ),
};
