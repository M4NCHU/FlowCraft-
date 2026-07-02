import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  type ApiRequestOptions,
} from "../../../shared/api/httpClient";
import type {
  CreateInventoryCategoryRequest,
  CreateInventoryItemRequest,
  CreateInventoryProcurementRequest,
  InventoryCategoryApiModel,
  InventoryItemApiModel,
  InventoryProcurementOrderApiModel,
  InventoryReplenishmentRecommendationApiModel,
  UpdateInventoryCategoryRequest,
  UpdateInventoryItemRequest,
  UpdateInventoryProcurementRequest,
} from "./contracts";

type InventoryRequestOptions<TBody = unknown> = Omit<
  ApiRequestOptions<TBody>,
  "method" | "body"
>;

export const inventoryApi = {
  listCategories: (signal?: AbortSignal) =>
    apiGet<InventoryCategoryApiModel[]>("/api/inventory/categories", {
      signal,
      withAuth: true,
    }),

  getCategoryById: (id: string, signal?: AbortSignal) =>
    apiGet<InventoryCategoryApiModel>(`/api/inventory/categories/${id}`, {
      signal,
      withAuth: true,
    }),

  createCategory: (
    body: CreateInventoryCategoryRequest,
    options?: InventoryRequestOptions<CreateInventoryCategoryRequest>,
    signal?: AbortSignal,
  ) =>
    apiPost<InventoryCategoryApiModel, CreateInventoryCategoryRequest>(
      "/api/inventory/categories",
      body,
      {
        ...options,
        signal,
        withAuth: true,
        notifyOnSuccess: options?.notifyOnSuccess ?? true,
        successMessage:
          options?.successMessage ?? "Kategoria magazynowa zostala dodana.",
      },
    ),

  updateCategory: (
    id: string,
    body: UpdateInventoryCategoryRequest,
    signal?: AbortSignal,
  ) =>
    apiPut<InventoryCategoryApiModel, UpdateInventoryCategoryRequest>(
      `/api/inventory/categories/${id}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Kategoria zostala zaktualizowana.",
      },
    ),

  deleteCategory: (id: string, signal?: AbortSignal) =>
    apiDelete(`/api/inventory/categories/${id}`, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Kategoria zostala usunieta.",
    }),

  listItems: (signal?: AbortSignal) =>
    apiGet<InventoryItemApiModel[]>("/api/inventory/items", {
      signal,
      withAuth: true,
    }),

  getItemById: (id: string, signal?: AbortSignal) =>
    apiGet<InventoryItemApiModel>(`/api/inventory/items/${id}`, {
      signal,
      withAuth: true,
    }),

  createItem: (
    body: CreateInventoryItemRequest,
    options?: InventoryRequestOptions<CreateInventoryItemRequest>,
    signal?: AbortSignal,
  ) =>
    apiPost<InventoryItemApiModel, CreateInventoryItemRequest>(
      "/api/inventory/items",
      body,
      {
        ...options,
        signal,
        withAuth: true,
        notifyOnSuccess: options?.notifyOnSuccess ?? true,
        successMessage:
          options?.successMessage ?? "Pozycja magazynowa zostala dodana.",
      },
    ),

  updateItem: (
    id: string,
    body: UpdateInventoryItemRequest,
    options?: InventoryRequestOptions<UpdateInventoryItemRequest>,
    signal?: AbortSignal,
  ) =>
    apiPut<InventoryItemApiModel, UpdateInventoryItemRequest>(
      `/api/inventory/items/${id}`,
      body,
      {
        ...options,
        signal,
        withAuth: true,
        notifyOnSuccess: options?.notifyOnSuccess ?? true,
        successMessage:
          options?.successMessage ?? "Pozycja zostala zaktualizowana.",
      },
    ),

  deleteItem: (id: string, signal?: AbortSignal) =>
    apiDelete(`/api/inventory/items/${id}`, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Pozycja zostala usunieta.",
    }),

  listProcurements: (signal?: AbortSignal) =>
    apiGet<InventoryProcurementOrderApiModel[]>("/api/inventory/procurements", {
      signal,
      withAuth: true,
    }),

  listOpenProcurements: (signal?: AbortSignal) =>
    apiGet<InventoryProcurementOrderApiModel[]>(
      "/api/inventory/procurements/open",
      {
        signal,
        withAuth: true,
      },
    ),

  listReplenishmentRecommendations: (signal?: AbortSignal) =>
    apiGet<InventoryReplenishmentRecommendationApiModel[]>(
      "/api/inventory/procurements/recommendations",
      {
        signal,
        withAuth: true,
      },
    ),

  getProcurementById: (id: string, signal?: AbortSignal) =>
    apiGet<InventoryProcurementOrderApiModel>(
      `/api/inventory/procurements/${id}`,
      {
        signal,
        withAuth: true,
      },
    ),

  createProcurement: (
    body: CreateInventoryProcurementRequest,
    options?: InventoryRequestOptions<CreateInventoryProcurementRequest>,
    signal?: AbortSignal,
  ) =>
    apiPost<
      InventoryProcurementOrderApiModel,
      CreateInventoryProcurementRequest
    >("/api/inventory/procurements", body, {
      ...options,
      signal,
      withAuth: true,
      notifyOnSuccess: options?.notifyOnSuccess ?? true,
      successMessage:
        options?.successMessage ?? "Zamowienie zaopatrzeniowe zostalo utworzone.",
    }),

  createRecommendedProcurementDraft: (
    itemId: string,
    options?: InventoryRequestOptions<undefined>,
    signal?: AbortSignal,
  ) =>
    apiPost<InventoryProcurementOrderApiModel, undefined>(
      `/api/inventory/procurements/recommendations/${itemId}/draft`,
      undefined,
      {
        ...options,
        signal,
        withAuth: true,
        notifyOnSuccess: options?.notifyOnSuccess ?? true,
        successMessage:
          options?.successMessage ?? "Projekt zakupu zostal utworzony.",
      },
    ),

  updateProcurement: (
    id: string,
    body: UpdateInventoryProcurementRequest,
    options?: InventoryRequestOptions<UpdateInventoryProcurementRequest>,
    signal?: AbortSignal,
  ) =>
    apiPut<
      InventoryProcurementOrderApiModel,
      UpdateInventoryProcurementRequest
    >(`/api/inventory/procurements/${id}`, body, {
      ...options,
      signal,
      withAuth: true,
      notifyOnSuccess: options?.notifyOnSuccess ?? true,
      successMessage:
        options?.successMessage ?? "Zamowienie zostalo zaktualizowane.",
    }),

  deleteProcurement: (id: string, signal?: AbortSignal) =>
    apiDelete(`/api/inventory/procurements/${id}`, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Zamowienie zostalo usuniete.",
    }),
};
