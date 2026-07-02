export enum InventoryParameterTypeDto {
  Text = 1,
  Number = 2,
  Boolean = 3,
  Select = 4,
}

export enum InventoryCriticalityDto {
  Low = 1,
  Medium = 2,
  High = 3,
}

export enum InventoryServiceTypeDto {
  Preventive = 1,
  Corrective = 2,
  Emergency = 3,
  Overhaul = 4,
  Inspection = 5,
  Other = 6,
}

export enum InventoryProcurementStatusDto {
  Draft = 1,
  Ordered = 2,
  AwaitingDelivery = 3,
  Received = 4,
}

export interface InventoryCategoryParameterApiModel {
  id: string;
  name: string;
  code: string;
  type: InventoryParameterTypeDto;
  unit?: string | null;
  required: boolean;
  options?: string[] | null;
}

export interface InventoryCategoryApiModel {
  id: string;
  name: string;
  code: string;
  domain: string;
  description?: string | null;
  defaultSupplier?: string | null;
  linkedDepartmentId?: string | null;
  isActive: boolean;
  parameterTemplates: InventoryCategoryParameterApiModel[];
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InventoryItemApiModel {
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
  linkedAssetCategoryId?: string | null;
  criticality: string;
  serviceType?: string | null;
  isActive: boolean;
  notes?: string | null;
  lastReceiptAtUtc?: string | null;
  parameterValues: Record<string, string>;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InventoryProcurementOrderApiModel {
  id: string;
  inventoryItemId: string;
  quantity: number;
  status: string;
  supplierName?: string | null;
  requestedByDepartmentId?: string | null;
  linkedWorkOrderId?: string | null;
  linkedMaintenancePlanId?: string | null;
  requestedAtUtc: string;
  expectedDeliveryAtUtc?: string | null;
  receivedAtUtc?: string | null;
  notes?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface InventoryReplenishmentRecommendationApiModel {
  itemId: string;
  categoryId: string;
  itemName: string;
  sku: string;
  categoryName: string;
  unit: string;
  supplierName?: string | null;
  criticality: string;
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
  urgency: string;
  recommendedAction: string;
  reason: string;
  nextExpectedDeliveryAtUtc?: string | null;
}

export interface CreateInventoryCategoryParameterRequest {
  name: string;
  code: string;
  type: InventoryParameterTypeDto;
  unit?: string | null;
  required: boolean;
  options?: string[] | null;
}

export interface CreateInventoryCategoryRequest {
  name: string;
  code: string;
  domain: string;
  description?: string | null;
  defaultSupplier?: string | null;
  linkedDepartmentId?: string | null;
  parameterTemplates: CreateInventoryCategoryParameterRequest[];
}

export interface UpdateInventoryCategoryRequest {
  name: string;
  description?: string | null;
  defaultSupplier?: string | null;
  linkedDepartmentId?: string | null;
}

export interface CreateInventoryItemRequest {
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
  linkedAssetCategoryId?: string | null;
  criticality: InventoryCriticalityDto;
  serviceType?: InventoryServiceTypeDto | null;
  notes?: string | null;
  parameterValues: Record<string, string>;
}

export interface UpdateInventoryItemRequest {
  name: string;
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
  criticality: InventoryCriticalityDto;
  serviceType?: InventoryServiceTypeDto | null;
  isActive: boolean;
  notes?: string | null;
  parameterValues: Record<string, string>;
}

export interface CreateInventoryProcurementRequest {
  inventoryItemId: string;
  quantity: number;
  supplierName?: string | null;
  requestedByDepartmentId?: string | null;
  linkedWorkOrderId?: string | null;
  linkedMaintenancePlanId?: string | null;
  expectedDeliveryAtUtc?: string | null;
  notes?: string | null;
}

export interface UpdateInventoryProcurementRequest {
  status: InventoryProcurementStatusDto;
  supplierName?: string | null;
  expectedDeliveryAtUtc?: string | null;
  receivedAtUtc?: string | null;
  notes?: string | null;
}
