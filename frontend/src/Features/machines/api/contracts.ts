export const AssetType = {
  Machine: 1,
  Vehicle: 2,
  Rack: 3,
  Tool: 4,
  Device: 5,
  Other: 99,
} as const;

export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const AssetStatus = {
  Available: 1,
  InUse: 2,
  InMaintenance: 3,
  Broken: 4,
  Retired: 5,
} as const;

export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const AssetAssignmentType = {
  Issue: 1,
  Return: 2,
  Transfer: 3,
} as const;

export type AssetAssignmentType =
  (typeof AssetAssignmentType)[keyof typeof AssetAssignmentType];

export const AssetAssignmentStatus = {
  Active: 1,
  Returned: 2,
  Cancelled: 3,
} as const;

export type AssetAssignmentStatus =
  (typeof AssetAssignmentStatus)[keyof typeof AssetAssignmentStatus];

export const AssetParameterType = {
  Text: 1,
  Number: 2,
  Boolean: 3,
  Select: 4,
} as const;

export type AssetParameterType =
  (typeof AssetParameterType)[keyof typeof AssetParameterType];

export const AssetMeterType = {
  OperatingHours: 1,
  ProductionCycles: 2,
  ProducedBatches: 3,
} as const;

export type AssetMeterType =
  (typeof AssetMeterType)[keyof typeof AssetMeterType];

export interface AssetCategoryParameterDto {
  id: string;
  name: string;
  code: string;
  type: AssetParameterType;
  unit?: string | null;
  isRequired: boolean;
  displayOrder: number;
  value?: string | null;
  defaultValue?: string | null;
  options: string[];
}

export interface AssetCategoryDto {
  id: string;
  name: string;
  code: string;
  assetType: AssetType;
  description?: string | null;
  isActive: boolean;
  assetsCount: number;
  parameters: AssetCategoryParameterDto[];
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface AssetCategoryParameterRequest {
  name: string;
  code: string;
  type: AssetParameterType;
  unit?: string | null;
  isRequired: boolean;
  displayOrder: number;
  defaultValue?: string | null;
  options: string[];
}

export interface CreateAssetCategoryRequest {
  name: string;
  code: string;
  assetType: AssetType;
  description?: string | null;
  parameters: AssetCategoryParameterRequest[];
}

export interface UpdateAssetCategoryRequest {
  name: string;
  code: string;
  assetType: AssetType;
  description?: string | null;
  isActive: boolean;
  parameters: AssetCategoryParameterRequest[];
}

export interface SetAssetParameterValueRequest {
  parameterDefinitionId: string;
  value?: string | null;
}

export interface AssetListItemDto {
  id: string;
  name: string;
  code: string;
  categoryId?: string | null;
  type: AssetType;
  status: AssetStatus;
  category?: string | null;
  isMobile: boolean;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface AssetPlacementDto {
  id: string;
  hallId: string;
  sectionId?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  isCurrent: boolean;
  placedAtUtc: string;
  removedAtUtc?: string | null;
  notes?: string | null;
}

export interface AssetAssignmentDto {
  id: string;
  employeeId: string;
  issuedByEmployeeId?: string | null;
  type: AssetAssignmentType;
  status: AssetAssignmentStatus;
  assignedAtUtc: string;
  dueBackAtUtc?: string | null;
  returnedAtUtc?: string | null;
  notes?: string | null;
}

export interface AssetUsageReadingDto {
  id: string;
  assetId: string;
  meterType: AssetMeterType;
  readingValue: number;
  recordedByEmployeeId?: string | null;
  recordedByEmployeeName?: string | null;
  notes?: string | null;
  recordedAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface AssetUsageSummaryDto {
  meterType: AssetMeterType;
  latestReadingValue?: number | null;
  latestRecordedAtUtc?: string | null;
  nextMaintenanceMeterValue?: number | null;
  remainingToNextMaintenance?: number | null;
}

export interface AssetDetailsDto {
  id: string;
  name: string;
  code: string;
  categoryId?: string | null;
  category?: string | null;
  description?: string | null;
  type: AssetType;
  status: AssetStatus;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  isMobile: boolean;
  isActive: boolean;
  purchasedAtUtc?: string | null;
  commissionedAtUtc?: string | null;
  warrantyUntilUtc?: string | null;
  lastInventoryCheckAtUtc?: string | null;
  notes?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  parameters: AssetCategoryParameterDto[];
  placements: AssetPlacementDto[];
  assignments: AssetAssignmentDto[];
  usageReadings: AssetUsageReadingDto[];
  usageSummaries: AssetUsageSummaryDto[];
  failureReportsCount: number;
  workOrdersCount: number;
}

export interface CreateAssetRequest {
  name: string;
  code: string;
  type: AssetType;
  categoryId?: string | null;
  category?: string | null;
  description?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  isMobile: boolean;
  notes?: string | null;
  parameters: SetAssetParameterValueRequest[];
}

export interface UpdateAssetRequest {
  name: string;
  code: string;
  type: AssetType;
  status: AssetStatus;
  categoryId?: string | null;
  category?: string | null;
  description?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  isMobile: boolean;
  notes?: string | null;
  parameters: SetAssetParameterValueRequest[];
}

export interface PlaceAssetRequest {
  hallId: string;
  sectionId?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  notes?: string | null;
}

export interface AssignAssetRequest {
  employeeId: string;
  issuedByEmployeeId?: string | null;
  dueBackAtUtc?: string | null;
  notes?: string | null;
}

export interface ReturnAssetRequest {
  returnedAtUtc?: string | null;
  notes?: string | null;
}

export interface CreateAssetUsageReadingRequest {
  meterType: AssetMeterType;
  readingValue: number;
  recordedByEmployeeId?: string | null;
  notes?: string | null;
  recordedAtUtc?: string | null;
}
