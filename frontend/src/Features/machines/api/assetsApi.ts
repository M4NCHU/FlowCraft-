import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../../../shared/api/httpClient";
import type {
  AssetAssignmentDto,
  AssetDetailsDto,
  AssetListItemDto,
  AssetPlacementDto,
  AssignAssetRequest,
  AssetUsageReadingDto,
  CreateAssetRequest,
  CreateAssetUsageReadingRequest,
  PlaceAssetRequest,
  ReturnAssetRequest,
  UpdateAssetRequest,
} from "./contracts";

export interface AssetsListParams {
  includeInactive?: boolean;
  signal?: AbortSignal;
}

export const assetsApi = {
  list: ({ includeInactive = false, signal }: AssetsListParams = {}) =>
    apiGet<AssetListItemDto[]>("/api/assets", {
      signal,
      withAuth: true,
      query: { includeInactive },
    }),

  getById: (assetId: string, signal?: AbortSignal) =>
    apiGet<AssetDetailsDto>(`/api/assets/${assetId}`, {
      signal,
      withAuth: true,
    }),

  create: (body: CreateAssetRequest, signal?: AbortSignal) =>
    apiPost<AssetDetailsDto, CreateAssetRequest>("/api/assets", body, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Maszyna została utworzona.",
    }),

  update: (assetId: string, body: UpdateAssetRequest, signal?: AbortSignal) =>
    apiPut<AssetDetailsDto, UpdateAssetRequest>(
      `/api/assets/${assetId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Maszyna została zaktualizowana.",
      }
    ),

  delete: (assetId: string, signal?: AbortSignal) =>
    apiDelete<void>(`/api/assets/${assetId}`, {
      signal,
      withAuth: true,
      responseType: "void",
      notifyOnSuccess: true,
      successMessage: "Maszyna została wycofana.",
    }),

  place: (assetId: string, body: PlaceAssetRequest, signal?: AbortSignal) =>
    apiPost<AssetPlacementDto, PlaceAssetRequest>(
      `/api/assets/${assetId}/placement`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Maszyna została rozmieszczona.",
      }
    ),

  assign: (assetId: string, body: AssignAssetRequest, signal?: AbortSignal) =>
    apiPost<AssetAssignmentDto, AssignAssetRequest>(
      `/api/assets/${assetId}/assignments`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Maszyna została przypisana.",
      }
    ),

  returnAsset: (
    assetId: string,
    body: ReturnAssetRequest,
    signal?: AbortSignal
  ) =>
    apiPost<AssetAssignmentDto, ReturnAssetRequest>(
      `/api/assets/${assetId}/return`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Maszyna została zwrócona.",
      }
    ),

  listUsageReadings: (assetId: string, signal?: AbortSignal) =>
    apiGet<AssetUsageReadingDto[]>(`/api/assets/${assetId}/usage-readings`, {
      signal,
      withAuth: true,
    }),

  addUsageReading: (
    assetId: string,
    body: CreateAssetUsageReadingRequest,
    signal?: AbortSignal
  ) =>
    apiPost<AssetUsageReadingDto, CreateAssetUsageReadingRequest>(
      `/api/assets/${assetId}/usage-readings`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Odczyt licznika został zapisany.",
      }
    ),
};
