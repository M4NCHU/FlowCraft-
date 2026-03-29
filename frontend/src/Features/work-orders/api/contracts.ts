export const WorkOrderType = {
  CorrectiveMaintenance: 1,
  PreventiveMaintenance: 2,
  Inspection: 3,
  Installation: 4,
  Relocation: 5,
  Other: 99,
} as const;

export type WorkOrderType =
  (typeof WorkOrderType)[keyof typeof WorkOrderType];

export const WorkOrderPriority = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;

export type WorkOrderPriority =
  (typeof WorkOrderPriority)[keyof typeof WorkOrderPriority];

export const WorkOrderStatus = {
  New: 1,
  Assigned: 2,
  InProgress: 3,
  WaitingForParts: 4,
  Done: 5,
  Cancelled: 6,
} as const;

export type WorkOrderStatus =
  (typeof WorkOrderStatus)[keyof typeof WorkOrderStatus];

export const WorkOrderSource = {
  Manual: 1,
  FailureReport: 2,
  PreventiveMaintenance: 3,
} as const;

export type WorkOrderSource =
  (typeof WorkOrderSource)[keyof typeof WorkOrderSource];

export interface WorkOrderDto {
  id: string;
  failureReportId?: string | null;
  maintenancePlanId?: string | null;
  assetId?: string | null;
  hallId?: string | null;
  sectionId?: string | null;
  requestedByEmployeeId?: string | null;
  assignedToEmployeeId?: string | null;
  number: string;
  title: string;
  description: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  source: WorkOrderSource;
  requestedAtUtc: string;
  plannedForOccurrenceUtc?: string | null;
  plannedStartAtUtc?: string | null;
  startedAtUtc?: string | null;
  completedAtUtc?: string | null;
  dueAtUtc?: string | null;
  triggeredByMeterValue?: number | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  estimatedCost?: number | null;
  actualCost?: number | null;
  externalVendor?: string | null;
  resolutionSummary?: string | null;
  autoCreated: boolean;
}

export interface CreateWorkOrderRequest {
  number: string;
  title: string;
  description: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  failureReportId?: string | null;
  assetId?: string | null;
  hallId?: string | null;
  sectionId?: string | null;
  requestedByEmployeeId?: string | null;
  assignedToEmployeeId?: string | null;
  dueAtUtc?: string | null;
  estimatedMinutes?: number | null;
  estimatedCost?: number | null;
  externalVendor?: string | null;
}

export interface UpdateWorkOrderRequest {
  number: string;
  title: string;
  description: string;
  type: WorkOrderType;
  priority: WorkOrderPriority;
  assignedToEmployeeId?: string | null;
  dueAtUtc?: string | null;
  estimatedMinutes?: number | null;
  estimatedCost?: number | null;
  externalVendor?: string | null;
}

export interface SetWorkOrderStatusRequest {
  status: WorkOrderStatus;
  actualMinutes?: number | null;
  actualCost?: number | null;
  resolutionSummary?: string | null;
}
