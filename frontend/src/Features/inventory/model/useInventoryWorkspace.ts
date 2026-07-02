import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  toApiError,
  type ApiError,
} from "../../../shared/api/httpClient";
import type { DepartmentDto } from "../../departments/api/contracts";
import {
  inventoryApi,
} from "../api/inventoryApi";
import {
  InventoryCriticalityDto,
  InventoryParameterTypeDto,
  InventoryProcurementStatusDto,
  InventoryServiceTypeDto,
  type CreateInventoryCategoryRequest,
  type CreateInventoryItemRequest,
  type CreateInventoryProcurementRequest,
  type InventoryCategoryApiModel,
  type InventoryItemApiModel,
  type InventoryProcurementOrderApiModel,
  type InventoryReplenishmentRecommendationApiModel,
  type UpdateInventoryItemRequest,
  type UpdateInventoryProcurementRequest,
} from "../api/contracts";
import type {
  AssetListItemDto,
  AssetCategoryDto,
} from "../../machines/api/contracts";
import {
  MaintenanceOccurrenceStatus,
  type MaintenancePlanDto,
} from "../../maintenance/api/contracts";
import {
  WorkOrderStatus,
  type WorkOrderDto,
} from "../../work-orders/api/contracts";

export type InventoryParameterType = "text" | "number" | "boolean" | "select";
export type InventoryDomain = "spare-parts" | "consumables" | "safety" | "mro";
export type InventoryCriticality = "low" | "medium" | "high";
export type InventoryProcurementStatus =
  | "draft"
  | "ordered"
  | "awaiting-delivery"
  | "received";
export type InventoryServiceType =
  | "preventive"
  | "corrective"
  | "emergency"
  | "overhaul"
  | "inspection"
  | "other";

export interface InventoryCategoryParameterDefinition {
  id: string;
  name: string;
  code: string;
  type: InventoryParameterType;
  unit?: string | null;
  required: boolean;
  options: string[];
}

export interface InventoryCategory {
  id: string;
  name: string;
  code: string;
  domain: InventoryDomain;
  description?: string | null;
  defaultSupplier?: string | null;
  linkedDepartmentId?: string | null;
  parameterTemplates: InventoryCategoryParameterDefinition[];
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InventoryItem {
  id: string;
  categoryId: string;
  name: string;
  sku: string;
  unit: string;
  quantityOnHand: number;
  quantityReserved: number;
  minimumStock: number;
  reorderQuantity: number;
  leadTimeDays: number;
  location: string;
  supplierName?: string | null;
  unitCost?: number | null;
  linkedDepartmentId?: string | null;
  linkedAssetId?: string | null;
  linkedMachineCategoryId?: string | null;
  parameterValues: Record<string, string>;
  criticality: InventoryCriticality;
  serviceType?: InventoryServiceType | null;
  isActive: boolean;
  notes?: string | null;
  lastReceiptAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InventoryProcurementOrder {
  id: string;
  itemId: string;
  quantity: number;
  status: InventoryProcurementStatus;
  supplierName?: string | null;
  requestedByDepartmentId?: string | null;
  linkedWorkOrderId?: string | null;
  linkedMaintenancePlanId?: string | null;
  requestedAtUtc: string;
  expectedDeliveryAtUtc?: string | null;
  notes?: string | null;
}

type InventoryWorkspaceState = {
  categories: InventoryCategory[];
  items: InventoryItem[];
  procurements: InventoryProcurementOrder[];
  recommendations: InventoryReplenishmentRecommendation[];
  loading: boolean;
  error: ApiError | null;
};

export type CreateInventoryCategoryInput = {
  name: string;
  code: string;
  domain: InventoryDomain;
  description?: string | null;
  defaultSupplier?: string | null;
  linkedDepartmentId?: string | null;
  parameterTemplates: Array<Omit<InventoryCategoryParameterDefinition, "id">>;
};

export type CreateInventoryItemInput = {
  categoryId: string;
  name: string;
  sku: string;
  unit: string;
  quantityOnHand: number;
  quantityReserved: number;
  minimumStock: number;
  reorderQuantity: number;
  leadTimeDays: number;
  location: string;
  supplierName?: string | null;
  unitCost?: number | null;
  linkedDepartmentId?: string | null;
  linkedAssetId?: string | null;
  linkedMachineCategoryId?: string | null;
  parameterValues: Record<string, string>;
  criticality: InventoryCriticality;
  serviceType?: InventoryServiceType | null;
  notes?: string | null;
};

export type CreateInventoryProcurementInput = {
  itemId: string;
  quantity: number;
  supplierName?: string | null;
  requestedByDepartmentId?: string | null;
  linkedWorkOrderId?: string | null;
  linkedMaintenancePlanId?: string | null;
  expectedDeliveryAtUtc?: string | null;
  notes?: string | null;
};

export type InventoryBatchFailure = {
  label: string;
  message: string;
};

export type InventoryBatchResult = {
  successCount: number;
  failures: InventoryBatchFailure[];
};

export interface InventoryItemInsight {
  availableQuantity: number;
  lowStock: boolean;
  activeProcurementsCount: number;
  linkedOpenWorkOrdersCount: number;
  linkedMaintenanceDemandCount: number;
  estimatedCoverageDays: number | null;
}

export interface InventorySuggestion {
  itemId: string;
  suggestedQuantity: number;
  urgency: "high" | "medium" | "low";
  reason: string;
}

export interface InventoryReplenishmentRecommendation {
  itemId: string;
  categoryId: string;
  itemName: string;
  sku: string;
  categoryName: string;
  unit: string;
  supplierName?: string | null;
  criticality: InventoryCriticality;
  quantityOnHand: number;
  quantityReserved: number;
  availableQuantity: number;
  minimumStock: number;
  openProcurementQuantity: number;
  suggestedQuantity: number;
  shortageQuantity: number;
  leadTimeDays: number;
  hasOpenProcurement: boolean;
  openProcurementId?: string | null;
  urgency: "high" | "medium" | "low";
  recommendedAction:
    | "create-procurement-draft"
    | "expedite-open-procurement"
    | "monitor";
  reason: string;
  nextExpectedDeliveryAtUtc?: string | null;
}

type UseInventoryWorkspaceOptions = {
  departments: DepartmentDto[];
  assets: AssetListItemDto[];
  machineCategories: AssetCategoryDto[];
  workOrders: WorkOrderDto[];
  maintenancePlans: MaintenancePlanDto[];
  seedReady: boolean;
};

const initialState: InventoryWorkspaceState = {
  categories: [],
  items: [],
  procurements: [],
  recommendations: [],
  loading: true,
  error: null,
};

function roundStock(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 100) / 100);
}

function formatBatchFailureMessage(
  actionLabel: string,
  failures: InventoryBatchFailure[],
) {
  if (failures.length === 0) return "";

  const preview = failures
    .slice(0, 3)
    .map((failure) => `${failure.label}: ${failure.message}`)
    .join(" | ");
  const remainder =
    failures.length > 3 ? ` i ${failures.length - 3} kolejnych.` : "";

  return `${actionLabel} zakonczono z bledami. ${preview}${remainder}`;
}

function canonicalizeEnum(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeInventoryDomain(raw: string): InventoryDomain {
  switch (canonicalizeEnum(raw)) {
    case "spareparts":
      return "spare-parts";
    case "consumables":
      return "consumables";
    case "safety":
      return "safety";
    default:
      return "mro";
  }
}

function normalizeParameterType(
  value: InventoryParameterTypeDto,
): InventoryParameterType {
  switch (value) {
    case InventoryParameterTypeDto.Number:
      return "number";
    case InventoryParameterTypeDto.Boolean:
      return "boolean";
    case InventoryParameterTypeDto.Select:
      return "select";
    default:
      return "text";
  }
}

function normalizeCriticality(raw: string): InventoryCriticality {
  switch (canonicalizeEnum(raw)) {
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

function normalizeServiceType(
  raw: string | null | undefined,
): InventoryServiceType | null {
  switch (canonicalizeEnum(raw)) {
    case "preventive":
      return "preventive";
    case "corrective":
      return "corrective";
    case "emergency":
      return "emergency";
    case "overhaul":
      return "overhaul";
    case "inspection":
      return "inspection";
    case "other":
      return "other";
    default:
      return null;
  }
}

function normalizeProcurementStatus(raw: string): InventoryProcurementStatus {
  switch (canonicalizeEnum(raw)) {
    case "ordered":
      return "ordered";
    case "awaitingdelivery":
      return "awaiting-delivery";
    case "received":
      return "received";
    default:
      return "draft";
  }
}

function inventoryDomainToApiValue(domain: InventoryDomain): string {
  switch (domain) {
    case "spare-parts":
      return "SpareParts";
    case "consumables":
      return "Consumables";
    case "safety":
      return "Safety";
    default:
      return "MRO";
  }
}

function parameterTypeToApiValue(
  type: InventoryParameterType,
): InventoryParameterTypeDto {
  switch (type) {
    case "number":
      return InventoryParameterTypeDto.Number;
    case "boolean":
      return InventoryParameterTypeDto.Boolean;
    case "select":
      return InventoryParameterTypeDto.Select;
    default:
      return InventoryParameterTypeDto.Text;
  }
}

function criticalityToApiValue(
  criticality: InventoryCriticality,
): InventoryCriticalityDto {
  switch (criticality) {
    case "medium":
      return InventoryCriticalityDto.Medium;
    case "high":
      return InventoryCriticalityDto.High;
    default:
      return InventoryCriticalityDto.Low;
  }
}

function serviceTypeToApiValue(
  type: InventoryServiceType | null | undefined,
): InventoryServiceTypeDto | null {
  switch (type) {
    case "preventive":
      return InventoryServiceTypeDto.Preventive;
    case "corrective":
      return InventoryServiceTypeDto.Corrective;
    case "emergency":
      return InventoryServiceTypeDto.Emergency;
    case "overhaul":
      return InventoryServiceTypeDto.Overhaul;
    case "inspection":
      return InventoryServiceTypeDto.Inspection;
    case "other":
      return InventoryServiceTypeDto.Other;
    default:
      return null;
  }
}

function procurementStatusToApiValue(
  status: InventoryProcurementStatus,
): InventoryProcurementStatusDto {
  switch (status) {
    case "ordered":
      return InventoryProcurementStatusDto.Ordered;
    case "awaiting-delivery":
      return InventoryProcurementStatusDto.AwaitingDelivery;
    case "received":
      return InventoryProcurementStatusDto.Received;
    default:
      return InventoryProcurementStatusDto.Draft;
  }
}

function mapCategoryFromApi(
  category: InventoryCategoryApiModel,
): InventoryCategory {
  return {
    id: category.id,
    name: category.name,
    code: category.code,
    domain: normalizeInventoryDomain(category.domain),
    description: category.description ?? null,
    defaultSupplier: category.defaultSupplier ?? null,
    linkedDepartmentId: category.linkedDepartmentId ?? null,
    parameterTemplates: (category.parameterTemplates ?? []).map((parameter) => ({
      id: parameter.id,
      name: parameter.name,
      code: parameter.code,
      type: normalizeParameterType(parameter.type),
      unit: parameter.unit ?? null,
      required: parameter.required,
      options: parameter.options ?? [],
    })),
    createdAtUtc: category.createdAtUtc,
    updatedAtUtc: category.updatedAtUtc,
  };
}

function mapItemParameterValues(
  parameterValues: Record<string, string>,
  category: InventoryCategory | undefined,
) {
  const mapped: Record<string, string> = {};

  for (const [key, value] of Object.entries(parameterValues ?? {})) {
    const template = category?.parameterTemplates.find(
      (parameter) => parameter.id === key || parameter.code === key,
    );
    mapped[template?.code ?? key] = value;
  }

  return mapped;
}

function mapItemFromApi(
  item: InventoryItemApiModel,
  categoriesById: Record<string, InventoryCategory>,
): InventoryItem {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    quantityOnHand: item.quantityOnHand,
    quantityReserved: item.quantityReserved,
    minimumStock: item.minimumStock,
    reorderQuantity: item.reorderQuantity,
    leadTimeDays: item.leadTimeDays,
    location: item.location,
    supplierName: item.supplierName ?? null,
    unitCost: item.unitCost ?? null,
    linkedDepartmentId: item.linkedDepartmentId ?? null,
    linkedAssetId: item.linkedAssetId ?? null,
    linkedMachineCategoryId: item.linkedAssetCategoryId ?? null,
    parameterValues: mapItemParameterValues(
      item.parameterValues,
      categoriesById[item.categoryId],
    ),
    criticality: normalizeCriticality(item.criticality),
    serviceType: normalizeServiceType(item.serviceType),
    isActive: item.isActive,
    notes: item.notes ?? null,
    lastReceiptAtUtc: item.lastReceiptAtUtc ?? null,
    createdAtUtc: item.createdAtUtc,
    updatedAtUtc: item.updatedAtUtc,
  };
}

function mapProcurementFromApi(
  procurement: InventoryProcurementOrderApiModel,
): InventoryProcurementOrder {
  return {
    id: procurement.id,
    itemId: procurement.inventoryItemId,
    quantity: procurement.quantity,
    status: normalizeProcurementStatus(procurement.status),
    supplierName: procurement.supplierName ?? null,
    requestedByDepartmentId: procurement.requestedByDepartmentId ?? null,
    linkedWorkOrderId: procurement.linkedWorkOrderId ?? null,
    linkedMaintenancePlanId: procurement.linkedMaintenancePlanId ?? null,
    requestedAtUtc: procurement.requestedAtUtc,
    expectedDeliveryAtUtc: procurement.expectedDeliveryAtUtc ?? null,
    notes: procurement.notes ?? null,
  };
}

function mapReplenishmentRecommendationFromApi(
  recommendation: InventoryReplenishmentRecommendationApiModel,
): InventoryReplenishmentRecommendation {
  return {
    itemId: recommendation.itemId,
    categoryId: recommendation.categoryId,
    itemName: recommendation.itemName,
    sku: recommendation.sku,
    categoryName: recommendation.categoryName,
    unit: recommendation.unit,
    supplierName: recommendation.supplierName ?? null,
    criticality: normalizeCriticality(recommendation.criticality),
    quantityOnHand: recommendation.quantityOnHand,
    quantityReserved: recommendation.quantityReserved,
    availableQuantity: recommendation.availableQuantity,
    minimumStock: recommendation.minimumStock,
    openProcurementQuantity: recommendation.openProcurementQuantity,
    suggestedQuantity: recommendation.suggestedQuantity,
    shortageQuantity: recommendation.shortageQuantity,
    leadTimeDays: recommendation.leadTimeDays,
    hasOpenProcurement: recommendation.hasOpenProcurement,
    openProcurementId: recommendation.openProcurementId ?? null,
    urgency:
      recommendation.urgency === "high"
        ? "high"
        : recommendation.urgency === "medium"
          ? "medium"
          : "low",
    recommendedAction:
      recommendation.recommendedAction === "create-procurement-draft"
        ? "create-procurement-draft"
        : recommendation.recommendedAction === "expedite-open-procurement"
          ? "expedite-open-procurement"
          : "monitor",
    reason: recommendation.reason,
    nextExpectedDeliveryAtUtc: recommendation.nextExpectedDeliveryAtUtc ?? null,
  };
}

function buildCategoryCreateRequest(
  input: CreateInventoryCategoryInput,
): CreateInventoryCategoryRequest {
  return {
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    domain: inventoryDomainToApiValue(input.domain),
    description: input.description?.trim() || null,
    defaultSupplier: input.defaultSupplier?.trim() || null,
    linkedDepartmentId: input.linkedDepartmentId || null,
    parameterTemplates: input.parameterTemplates.map((parameter) => ({
      name: parameter.name.trim(),
      code: parameter.code.trim().toUpperCase(),
      type: parameterTypeToApiValue(parameter.type),
      unit: parameter.unit?.trim() || null,
      required: parameter.required,
      options:
        parameter.type === "select"
          ? parameter.options.filter(Boolean)
          : [],
    })),
  };
}

function buildParameterValuePayload(
  parameterValues: Record<string, string>,
  category: InventoryCategory | undefined,
) {
  const payload: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(parameterValues)) {
    const value = rawValue.trim();
    if (!value) continue;

    const template = category?.parameterTemplates.find(
      (parameter) => parameter.code === key || parameter.id === key,
    );

    payload[template?.id ?? key] = value;
  }

  return payload;
}

function buildItemCreateRequest(
  input: CreateInventoryItemInput,
  category: InventoryCategory | undefined,
): CreateInventoryItemRequest {
  return {
    categoryId: input.categoryId,
    name: input.name.trim(),
    sku: input.sku.trim().toUpperCase(),
    unit: input.unit.trim() || "szt.",
    quantityOnHand: roundStock(input.quantityOnHand),
    quantityReserved: roundStock(input.quantityReserved),
    minimumStock: roundStock(input.minimumStock),
    reorderQuantity: roundStock(input.reorderQuantity),
    leadTimeDays: Math.max(1, Math.round(input.leadTimeDays)),
    location: input.location.trim(),
    supplierName: input.supplierName?.trim() || null,
    unitCost: input.unitCost ?? null,
    linkedDepartmentId: input.linkedDepartmentId || null,
    linkedAssetId: input.linkedAssetId || null,
    linkedAssetCategoryId: input.linkedMachineCategoryId || null,
    criticality: criticalityToApiValue(input.criticality),
    serviceType: serviceTypeToApiValue(input.serviceType),
    notes: input.notes?.trim() || null,
    parameterValues: buildParameterValuePayload(input.parameterValues, category),
  };
}

function buildItemUpdateRequest(
  item: InventoryItem,
  category: InventoryCategory | undefined,
): UpdateInventoryItemRequest {
  return {
    name: item.name.trim(),
    quantityOnHand: roundStock(item.quantityOnHand),
    quantityReserved: roundStock(item.quantityReserved),
    minimumStock: roundStock(item.minimumStock),
    reorderQuantity: roundStock(item.reorderQuantity),
    leadTimeDays: Math.max(1, Math.round(item.leadTimeDays)),
    location: item.location.trim(),
    supplierName: item.supplierName?.trim() || null,
    unitCost: item.unitCost ?? null,
    linkedDepartmentId: item.linkedDepartmentId || null,
    linkedAssetId: item.linkedAssetId || null,
    criticality: criticalityToApiValue(item.criticality),
    serviceType: serviceTypeToApiValue(item.serviceType),
    isActive: item.isActive,
    notes: item.notes?.trim() || null,
    parameterValues: buildParameterValuePayload(item.parameterValues, category),
  };
}

function buildProcurementCreateRequest(
  input: CreateInventoryProcurementInput,
): CreateInventoryProcurementRequest {
  return {
    inventoryItemId: input.itemId,
    quantity: roundStock(input.quantity),
    supplierName: input.supplierName?.trim() || null,
    requestedByDepartmentId: input.requestedByDepartmentId || null,
    linkedWorkOrderId: input.linkedWorkOrderId || null,
    linkedMaintenancePlanId: input.linkedMaintenancePlanId || null,
    expectedDeliveryAtUtc: input.expectedDeliveryAtUtc || null,
    notes: input.notes?.trim() || null,
  };
}

function buildProcurementUpdateRequest(
  procurement: InventoryProcurementOrder,
  status: InventoryProcurementStatus,
): UpdateInventoryProcurementRequest {
  return {
    status: procurementStatusToApiValue(status),
    supplierName: procurement.supplierName?.trim() || null,
    expectedDeliveryAtUtc: procurement.expectedDeliveryAtUtc || null,
    receivedAtUtc: status === "received" ? new Date().toISOString() : null,
    notes: procurement.notes?.trim() || null,
  };
}

function getNextProcurementStatus(
  status: InventoryProcurementStatus,
): InventoryProcurementStatus {
  switch (status) {
    case "draft":
      return "ordered";
    case "ordered":
      return "awaiting-delivery";
    case "awaiting-delivery":
      return "received";
    default:
      return "received";
  }
}

export function inventoryDomainLabel(domain: InventoryDomain) {
  switch (domain) {
    case "spare-parts":
      return "Czesci zamienne";
    case "consumables":
      return "Eksploatacja";
    case "safety":
      return "BHP / 5S";
    default:
      return "MRO";
  }
}

export function procurementStatusLabel(status: InventoryProcurementStatus) {
  switch (status) {
    case "draft":
      return "W przygotowaniu";
    case "ordered":
      return "Zamowione";
    case "awaiting-delivery":
      return "W dostawie";
    default:
      return "Przyjete";
  }
}

export function procurementStatusTone(status: InventoryProcurementStatus) {
  switch (status) {
    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "ordered":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "awaiting-delivery":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function serviceTypeLabel(
  type: InventoryServiceType | undefined | null,
) {
  switch (type) {
    case "preventive":
      return "Prewencyjny";
    case "corrective":
      return "Korekcyjny";
    case "emergency":
      return "Awarijny";
    case "overhaul":
      return "Remontowy";
    case "inspection":
      return "Kontrolny";
    case "other":
      return "Inny";
    default:
      return "Nieokreslony";
  }
}

export function serviceTypeTone(type: InventoryServiceType | undefined | null) {
  switch (type) {
    case "preventive":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "corrective":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "emergency":
      return "border-rose-200 bg-rose-50 text-rose-800";
    case "overhaul":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "inspection":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export const criticalityTone: Record<InventoryCriticality, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-700",
  medium: "border-amber-200 bg-amber-50 text-amber-800",
  high: "border-rose-200 bg-rose-50 text-rose-800",
};

export const inventoryDomainOptions: Array<{
  value: InventoryDomain;
  label: string;
}> = [
  { value: "spare-parts", label: "Czesci zamienne" },
  { value: "consumables", label: "Eksploatacja" },
  { value: "safety", label: "BHP / 5S" },
  { value: "mro", label: "MRO" },
];

export const serviceTypeOptions: Array<{
  value: InventoryServiceType;
  label: string;
}> = [
  { value: "preventive", label: "Prewencyjny" },
  { value: "corrective", label: "Korekcyjny" },
  { value: "emergency", label: "Awarijny" },
  { value: "overhaul", label: "Remontowy" },
  { value: "inspection", label: "Kontrolny" },
  { value: "other", label: "Inny" },
];

export function useInventoryWorkspace({
  departments: _departments,
  assets,
  machineCategories: _machineCategories,
  workOrders,
  maintenancePlans,
  seedReady,
}: UseInventoryWorkspaceOptions) {
  const [state, setState] = useState<InventoryWorkspaceState>(initialState);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    const results = await Promise.allSettled([
      inventoryApi.listCategories(signal),
      inventoryApi.listItems(signal),
      inventoryApi.listProcurements(signal),
      inventoryApi.listReplenishmentRecommendations(signal),
    ]);

    if (signal?.aborted) return;

    const [
      categoriesResult,
      itemsResult,
      procurementsResult,
      recommendationsResult,
    ] = results;
    const firstRejected = results.find((result) => result.status === "rejected");

    const categories =
      categoriesResult.status === "fulfilled"
        ? (categoriesResult.value ?? []).map(mapCategoryFromApi)
        : [];
    const categoriesById = Object.fromEntries(
      categories.map((category) => [category.id, category]),
    );
    const items =
      itemsResult.status === "fulfilled"
        ? (itemsResult.value ?? []).map((item) =>
            mapItemFromApi(item, categoriesById),
          )
        : [];
    const procurements =
      procurementsResult.status === "fulfilled"
        ? (procurementsResult.value ?? []).map(mapProcurementFromApi)
        : [];
    const recommendations =
      recommendationsResult.status === "fulfilled"
        ? (recommendationsResult.value ?? []).map(
            mapReplenishmentRecommendationFromApi,
          )
        : [];

    setState({
      categories,
      items,
      procurements,
      recommendations,
      loading: false,
      error: firstRejected
        ? toApiError(
            firstRejected.reason,
            "Nie udało się załadować danych magazynu.",
          )
        : null,
    });
  }, []);

  useEffect(() => {
    if (!seedReady) return;

    const controller = new AbortController();
    void loadData(controller.signal);

    return () => controller.abort();
  }, [loadData, seedReady]);

  const categoriesById = useMemo(
    () =>
      Object.fromEntries(state.categories.map((category) => [category.id, category])),
    [state.categories],
  );

  const activeWorkOrders = useMemo(
    () =>
      workOrders.filter(
        (workOrder) =>
          workOrder.status !== WorkOrderStatus.Done &&
          workOrder.status !== WorkOrderStatus.Cancelled,
      ),
    [workOrders],
  );

  const urgentMaintenancePlans = useMemo(
    () =>
      maintenancePlans.filter(
        (plan) =>
          plan.currentStatus === MaintenanceOccurrenceStatus.Overdue ||
          plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon,
      ),
    [maintenancePlans],
  );

  const insightsByItemId = useMemo<Record<string, InventoryItemInsight>>(() => {
    return state.items.reduce<Record<string, InventoryItemInsight>>(
      (accumulator, item) => {
        const availableQuantity = roundStock(
          item.quantityOnHand - item.quantityReserved,
        );
        const activeProcurementsCount = state.procurements.filter(
          (procurement) =>
            procurement.itemId === item.id && procurement.status !== "received",
        ).length;
        const linkedOpenWorkOrdersCount = activeWorkOrders.filter(
          (workOrder) => {
            if (item.linkedAssetId && workOrder.assetId === item.linkedAssetId) {
              return true;
            }

            if (!item.linkedMachineCategoryId || !workOrder.assetId) {
              return false;
            }

            const asset = assets.find((entry) => entry.id === workOrder.assetId);
            return asset?.categoryId === item.linkedMachineCategoryId;
          },
        ).length;
        const linkedMaintenanceDemandCount = urgentMaintenancePlans.filter(
          (plan) => {
            if (item.linkedAssetId && plan.assetId === item.linkedAssetId) {
              return true;
            }

            if (!item.linkedMachineCategoryId) return false;

            const asset = assets.find((entry) => entry.id === plan.assetId);
            return asset?.categoryId === item.linkedMachineCategoryId;
          },
        ).length;
        const lowStock = availableQuantity <= item.minimumStock;
        const estimatedDemand =
          linkedOpenWorkOrdersCount + linkedMaintenanceDemandCount;

        accumulator[item.id] = {
          availableQuantity,
          lowStock,
          activeProcurementsCount,
          linkedOpenWorkOrdersCount,
          linkedMaintenanceDemandCount,
          estimatedCoverageDays:
            estimatedDemand > 0
              ? Math.max(
                  0,
                  Math.round(
                    (availableQuantity / estimatedDemand) * item.leadTimeDays,
                  ),
                )
              : null,
        };

        return accumulator;
      },
      {},
    );
  }, [activeWorkOrders, assets, state.items, state.procurements, urgentMaintenancePlans]);

  const suggestions = useMemo<InventorySuggestion[]>(() => {
    return state.items
      .filter((item) => item.isActive)
      .map((item) => {
        const insight = insightsByItemId[item.id];
        if (!insight) return null;

        const operationalDemand =
          insight.linkedOpenWorkOrdersCount +
          insight.linkedMaintenanceDemandCount;
        const shortage = Math.max(
          item.minimumStock - insight.availableQuantity,
          0,
        );
        const suggestedQuantity = Math.max(
          item.reorderQuantity,
          shortage + operationalDemand,
        );

        if (
          suggestedQuantity <= 0 ||
          (!insight.lowStock && operationalDemand === 0)
        ) {
          return null;
        }

        let urgency: InventorySuggestion["urgency"] = "low";
        if (
          item.criticality === "high" &&
          (insight.lowStock || operationalDemand > 0)
        ) {
          urgency = "high";
        } else if (insight.lowStock || operationalDemand > 0) {
          urgency = "medium";
        }

        const reasonParts: string[] = [];
        if (insight.lowStock) {
          reasonParts.push(
            `stan dostepny ${insight.availableQuantity} / minimum ${item.minimumStock}`,
          );
        }
        if (insight.linkedOpenWorkOrdersCount > 0) {
          reasonParts.push(
            `${insight.linkedOpenWorkOrdersCount} otwartych zlecen serwisowych`,
          );
        }
        if (insight.linkedMaintenanceDemandCount > 0) {
          reasonParts.push(
            `${insight.linkedMaintenanceDemandCount} planow do wykonania`,
          );
        }

        return {
          itemId: item.id,
          suggestedQuantity,
          urgency,
          reason: reasonParts.join(" · "),
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const urgencyRank = { high: 0, medium: 1, low: 2 };
        return urgencyRank[left!.urgency] - urgencyRank[right!.urgency];
      }) as InventorySuggestion[];
  }, [insightsByItemId, state.items]);

  const metrics = useMemo(() => {
    const activeItems = state.items.filter((item) => item.isActive);

    return {
      categoriesCount: state.categories.length,
      activeItemsCount: activeItems.length,
      lowStockCount: activeItems.filter(
        (item) => insightsByItemId[item.id]?.lowStock,
      ).length,
      openProcurementsCount: state.procurements.filter(
        (procurement) => procurement.status !== "received",
      ).length,
      reservedUnits: activeItems.reduce(
        (sum, item) => sum + item.quantityReserved,
        0,
      ),
      estimatedValue: activeItems.reduce(
        (sum, item) => sum + item.quantityOnHand * (item.unitCost ?? 0),
        0,
      ),
      itemsLinkedToOperations: activeItems.filter((item) => {
        const insight = insightsByItemId[item.id];
        return (
          insight?.linkedOpenWorkOrdersCount ||
          insight?.linkedMaintenanceDemandCount
        );
      }).length,
    };
  }, [insightsByItemId, state.categories.length, state.items, state.procurements]);

  const addCategory = useCallback(
    async (input: CreateInventoryCategoryInput) => {
      await inventoryApi.createCategory(buildCategoryCreateRequest(input));
      await loadData();
    },
    [loadData],
  );

  const addItem = useCallback(
    async (input: CreateInventoryItemInput) => {
      const category = categoriesById[input.categoryId];
      await inventoryApi.createItem(buildItemCreateRequest(input, category));
      await loadData();
    },
    [categoriesById, loadData],
  );

  const addItemsBatch = useCallback(
    async (inputs: CreateInventoryItemInput[]): Promise<InventoryBatchResult> => {
      const failures: InventoryBatchFailure[] = [];
      let successCount = 0;

      for (const input of inputs) {
        const category = categoriesById[input.categoryId];

        try {
          await inventoryApi.createItem(
            buildItemCreateRequest(input, category),
            {
              notifyOnSuccess: false,
              notifyOnError: false,
            },
          );
          successCount += 1;
        } catch (error) {
          failures.push({
            label: input.name.trim() || input.sku.trim() || "Pozycja",
            message: toApiError(
              error,
              "Nie udalo sie dodac pozycji magazynowej.",
            ).message,
          });
        }
      }

      await loadData();

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "Dodano 1 pozycje magazynowa."
            : `Dodano ${successCount} pozycji magazynowych.`,
        );
      }

      if (failures.length > 0) {
        toast.error(
          formatBatchFailureMessage("Import pozycji", failures),
        );
      }

      return { successCount, failures };
    },
    [categoriesById, loadData],
  );

  const addProcurement = useCallback(
    async (input: CreateInventoryProcurementInput) => {
      await inventoryApi.createProcurement(buildProcurementCreateRequest(input));
      await loadData();
    },
    [loadData],
  );

  const addProcurementsBatch = useCallback(
    async (
      inputs: CreateInventoryProcurementInput[],
    ): Promise<InventoryBatchResult> => {
      const failures: InventoryBatchFailure[] = [];
      let successCount = 0;

      for (const input of inputs) {
        const item = state.items.find((entry) => entry.id === input.itemId);

        try {
          await inventoryApi.createProcurement(
            buildProcurementCreateRequest(input),
            {
              notifyOnSuccess: false,
              notifyOnError: false,
            },
          );
          successCount += 1;
        } catch (error) {
          failures.push({
            label: item?.name ?? "Zakup",
            message: toApiError(
              error,
              "Nie udalo sie utworzyc zamowienia.",
            ).message,
          });
        }
      }

      await loadData();

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "Dodano 1 zamowienie."
            : `Dodano ${successCount} zamowien.`,
        );
      }

      if (failures.length > 0) {
        toast.error(
          formatBatchFailureMessage("Tworzenie zamowien", failures),
        );
      }

      return { successCount, failures };
    },
    [loadData, state.items],
  );

  const adjustItemStock = useCallback(
    async (itemId: string, delta: number) => {
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) return;

      const nextItem: InventoryItem = {
        ...item,
        quantityOnHand: roundStock(
          Math.max(0, item.quantityOnHand + delta),
        ),
      };

      await inventoryApi.updateItem(
        itemId,
        buildItemUpdateRequest(nextItem, categoriesById[item.categoryId]),
      );
      await loadData();
    },
    [categoriesById, loadData, state.items],
  );

  const adjustItemReservation = useCallback(
    async (itemId: string, delta: number) => {
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) return;

      const nextItem: InventoryItem = {
        ...item,
        quantityReserved: roundStock(
          Math.max(
            0,
            Math.min(item.quantityOnHand, item.quantityReserved + delta),
          ),
        ),
      };

      await inventoryApi.updateItem(
        itemId,
        buildItemUpdateRequest(nextItem, categoriesById[item.categoryId]),
      );
      await loadData();
    },
    [categoriesById, loadData, state.items],
  );

  const advanceProcurementStatus = useCallback(
    async (procurementId: string) => {
      const procurement = state.procurements.find(
        (entry) => entry.id === procurementId,
      );
      if (!procurement) return;

      const nextStatus = getNextProcurementStatus(procurement.status);
      await inventoryApi.updateProcurement(
        procurementId,
        buildProcurementUpdateRequest(procurement, nextStatus),
      );

      if (nextStatus === "received") {
        const item = state.items.find((entry) => entry.id === procurement.itemId);
        if (item) {
          await inventoryApi.updateItem(
            item.id,
            buildItemUpdateRequest(
              {
                ...item,
                quantityOnHand: roundStock(item.quantityOnHand + procurement.quantity),
              },
              categoriesById[item.categoryId],
            ),
          );
        }
      }

      await loadData();
    },
    [categoriesById, loadData, state.items, state.procurements],
  );

  const createRecommendedProcurementDraft = useCallback(
    async (itemId: string) => {
      await inventoryApi.createRecommendedProcurementDraft(itemId);
      await loadData();
    },
    [loadData],
  );

  const createRecommendedProcurementDraftsBatch = useCallback(
    async (itemIds: string[]): Promise<InventoryBatchResult> => {
      const failures: InventoryBatchFailure[] = [];
      let successCount = 0;

      for (const itemId of itemIds) {
        const item = state.items.find((entry) => entry.id === itemId);

        try {
          await inventoryApi.createRecommendedProcurementDraft(
            itemId,
            {
              notifyOnSuccess: false,
              notifyOnError: false,
            },
          );
          successCount += 1;
        } catch (error) {
          failures.push({
            label: item?.name ?? "Projekt zakupu",
            message: toApiError(
              error,
              "Nie udalo sie utworzyc projektu zakupu.",
            ).message,
          });
        }
      }

      await loadData();

      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "Utworzono 1 projekt zakupu."
            : `Utworzono ${successCount} projektow zakupu.`,
        );
      }

      if (failures.length > 0) {
        toast.error(
          formatBatchFailureMessage("Tworzenie projektow zakupow", failures),
        );
      }

      return { successCount, failures };
    },
    [loadData, state.items],
  );

  const reload = useCallback(async () => {
    if (!seedReady) return;
    await loadData();
  }, [loadData, seedReady]);

  return {
    isReady: seedReady && !state.loading,
    loading: state.loading,
    error: state.error,
    categories: state.categories,
    items: state.items,
    procurements: state.procurements,
    recommendations: state.recommendations,
    metrics,
    insightsByItemId,
    suggestions,
    addCategory,
    addItem,
    addItemsBatch,
    addProcurement,
    addProcurementsBatch,
    adjustItemStock,
    adjustItemReservation,
    advanceProcurementStatus,
    createRecommendedProcurementDraft,
    createRecommendedProcurementDraftsBatch,
    resetWorkspace: reload,
    reload,
  };
}
