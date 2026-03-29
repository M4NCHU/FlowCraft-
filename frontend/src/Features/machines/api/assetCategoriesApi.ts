import { apiGet, apiPost, apiPut } from "../../../shared/api/httpClient";
import {
  AssetType,
  type AssetCategoryDto,
  type CreateAssetCategoryRequest,
  type UpdateAssetCategoryRequest,
} from "./contracts";

export interface AssetCategoriesListParams {
  assetType?: AssetType;
  includeInactive?: boolean;
  signal?: AbortSignal;
}

export const assetCategoriesApi = {
  list: ({
    assetType,
    includeInactive = false,
    signal,
  }: AssetCategoriesListParams = {}) =>
    apiGet<AssetCategoryDto[]>("/api/asset-categories", {
      signal,
      withAuth: true,
      query: {
        assetType,
        includeInactive,
      },
    }),

  getById: (categoryId: string, signal?: AbortSignal) =>
    apiGet<AssetCategoryDto>(`/api/asset-categories/${categoryId}`, {
      signal,
      withAuth: true,
    }),

  create: (body: CreateAssetCategoryRequest, signal?: AbortSignal) =>
    apiPost<AssetCategoryDto, CreateAssetCategoryRequest>(
      "/api/asset-categories",
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Kategoria maszyny została utworzona.",
      }
    ),

  update: (
    categoryId: string,
    body: UpdateAssetCategoryRequest,
    signal?: AbortSignal
  ) =>
    apiPut<AssetCategoryDto, UpdateAssetCategoryRequest>(
      `/api/asset-categories/${categoryId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Kategoria maszyny została zaktualizowana.",
      }
    ),
};
