import { apiGet, apiPost, apiPut } from "../../../shared/api/httpClient";
import type {
  CreateWorkOrderRequest,
  SetWorkOrderStatusRequest,
  UpdateWorkOrderRequest,
  WorkOrderDto,
} from "./contracts";

export const workOrdersApi = {
  list: (signal?: AbortSignal) =>
    apiGet<WorkOrderDto[]>("/api/workorders", {
      signal,
      withAuth: true,
    }),

  getById: (workOrderId: string, signal?: AbortSignal) =>
    apiGet<WorkOrderDto>(`/api/workorders/${workOrderId}`, {
      signal,
      withAuth: true,
    }),

  create: (body: CreateWorkOrderRequest, signal?: AbortSignal) =>
    apiPost<WorkOrderDto, CreateWorkOrderRequest>("/api/workorders", body, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Zlecenie serwisowe zostało utworzone.",
    }),

  update: (
    workOrderId: string,
    body: UpdateWorkOrderRequest,
    signal?: AbortSignal
  ) =>
    apiPut<WorkOrderDto, UpdateWorkOrderRequest>(
      `/api/workorders/${workOrderId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Zlecenie serwisowe zostało zaktualizowane.",
      }
    ),

  setStatus: (
    workOrderId: string,
    body: SetWorkOrderStatusRequest,
    signal?: AbortSignal
  ) =>
    apiPut<WorkOrderDto, SetWorkOrderStatusRequest>(
      `/api/workorders/${workOrderId}/status`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Status zlecenia został zaktualizowany.",
      }
    ),
};
