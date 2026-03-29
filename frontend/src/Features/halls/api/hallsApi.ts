import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../../../shared/api/httpClient";
import type { HallSummary } from "../model/model";
import type {
  CreateHallRequest,
  CreateSectionRequest,
  HallDetailsResponse,
  HallSectionResponse,
  HallSummaryResponse,
  UpdateHallRequest,
  UpdateSectionRequest,
} from "./contracts";

export function getHalls(signal?: AbortSignal): Promise<HallSummary[]> {
  return apiGet<HallSummaryResponse[]>("/api/halls", { signal, withAuth: true });
}

export function createHall(body: CreateHallRequest, signal?: AbortSignal) {
  return apiPost<HallDetailsResponse, CreateHallRequest>("/api/halls", body, {
    signal,
    withAuth: true,
    notifyOnError: true,
    notifyOnSuccess: true,
    successMessage: "Hala została utworzona.",
  });
}

export function getHallDetails(
  hallId: string,
  signal?: AbortSignal
): Promise<HallDetailsResponse> {
  return apiGet<HallDetailsResponse>(`/api/halls/${hallId}`, {
    signal,
    withAuth: true,
  });
}

export function updateHall(
  hallId: string,
  body: UpdateHallRequest,
  signal?: AbortSignal
) {
  return apiPut<void, UpdateHallRequest>(`/api/halls/${hallId}`, body, {
    signal,
    withAuth: true,
    responseType: "void",
    notifyOnSuccess: true,
    successMessage: "Hala została zapisana.",
  });
}

export function deleteHall(hallId: string, signal?: AbortSignal) {
  return apiDelete<void>(`/api/halls/${hallId}`, {
    signal,
    withAuth: true,
    responseType: "void",
    notifyOnSuccess: true,
    successMessage: "Hala została usunieta.",
  });
}

export function getSections(hallId: string, signal?: AbortSignal) {
  return apiGet<HallSectionResponse[]>(`/api/halls/${hallId}/sections`, {
    signal,
    withAuth: true,
  });
}

export function createSection(
  hallId: string,
  body: CreateSectionRequest,
  signal?: AbortSignal
) {
  return apiPost<HallSectionResponse, CreateSectionRequest>(
    `/api/halls/${hallId}/sections`,
    body,
    {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Sekcja została utworzona.",
    }
  );
}

export function updateSection(
  hallId: string,
  sectionId: string,
  body: UpdateSectionRequest,
  signal?: AbortSignal
) {
  return apiPut<void, UpdateSectionRequest>(
    `/api/halls/${hallId}/sections/${sectionId}`,
    body,
    {
      signal,
      withAuth: true,
      responseType: "void",
      notifyOnSuccess: true,
      successMessage: "Sekcja została zapisana.",
    }
  );
}

export function deleteSection(
  hallId: string,
  sectionId: string,
  signal?: AbortSignal
) {
  return apiDelete<void>(`/api/halls/${hallId}/sections/${sectionId}`, {
    signal,
    withAuth: true,
    responseType: "void",
    notifyOnSuccess: true,
    successMessage: "Sekcja została usunieta.",
  });
}
