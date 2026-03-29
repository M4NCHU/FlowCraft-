import type { AssetMeterType } from "../../machines/api/contracts";

export const MaintenanceScheduleType = {
  OneTime: 1,
  Recurring: 2,
} as const;

export type MaintenanceScheduleType =
  (typeof MaintenanceScheduleType)[keyof typeof MaintenanceScheduleType];

export const MaintenanceRecurrenceUnit = {
  Day: 1,
  Week: 2,
  Month: 3,
  Quarter: 4,
  Year: 5,
} as const;

export type MaintenanceRecurrenceUnit =
  (typeof MaintenanceRecurrenceUnit)[keyof typeof MaintenanceRecurrenceUnit];

export const MaintenanceOccurrenceStatus = {
  Upcoming: 1,
  DueSoon: 2,
  Overdue: 3,
  Completed: 4,
  Inactive: 5,
} as const;

export type MaintenanceOccurrenceStatus =
  (typeof MaintenanceOccurrenceStatus)[keyof typeof MaintenanceOccurrenceStatus];

export const MaintenanceTriggerMode = {
  Calendar: 1,
  Meter: 2,
} as const;

export type MaintenanceTriggerMode =
  (typeof MaintenanceTriggerMode)[keyof typeof MaintenanceTriggerMode];

export interface MaintenanceExecutionDto {
  id: string;
  maintenancePlanId: string;
  assetId: string;
  scheduledForUtc: string;
  scheduledMeterValue?: number | null;
  completedAtUtc?: string | null;
  outcome: number;
  completedByEmployeeId?: string | null;
  actualMinutes?: number | null;
  notes?: string | null;
}

export interface MaintenancePlanDto {
  id: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  assignedToEmployeeId?: string | null;
  assignedToEmployeeName?: string | null;
  title: string;
  description?: string | null;
  scheduleType: MaintenanceScheduleType;
  triggerMode: MaintenanceTriggerMode;
  startsAtUtc: string;
  nextDueAtUtc?: string | null;
  recurrenceUnit?: MaintenanceRecurrenceUnit | null;
  recurrenceInterval?: number | null;
  meterType?: AssetMeterType | null;
  meterInterval?: number | null;
  nextDueMeterValue?: number | null;
  lastCompletedMeterValue?: number | null;
  autoCreateLeadMeterValue?: number | null;
  autoCreateWorkOrder: boolean;
  leadTimeDays: number;
  estimatedDurationMinutes?: number | null;
  checklist?: string | null;
  instructions?: string | null;
  isActive: boolean;
  lastCompletedAtUtc?: string | null;
  openWorkOrderId?: string | null;
  currentStatus: MaintenanceOccurrenceStatus;
  executionsCount: number;
  recentExecutions: MaintenanceExecutionDto[];
}

export interface MaintenanceCalendarOccurrenceDto {
  planId: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  planTitle: string;
  scheduledForUtc: string;
  scheduledMeterValue?: number | null;
  completedAtUtc?: string | null;
  status: MaintenanceOccurrenceStatus;
  triggerMode: MaintenanceTriggerMode;
  leadTimeDays: number;
  estimatedDurationMinutes?: number | null;
  openWorkOrderId?: string | null;
  checklist?: string | null;
  notes?: string | null;
}

export interface CreateMaintenancePlanRequest {
  assetId: string;
  assignedToEmployeeId?: string | null;
  title: string;
  description?: string | null;
  scheduleType: MaintenanceScheduleType;
  triggerMode: MaintenanceTriggerMode;
  startsAtUtc: string;
  recurrenceUnit?: MaintenanceRecurrenceUnit | null;
  recurrenceInterval?: number | null;
  meterType?: AssetMeterType | null;
  meterInterval?: number | null;
  startsAtMeterValue?: number | null;
  autoCreateLeadMeterValue?: number | null;
  autoCreateWorkOrder: boolean;
  leadTimeDays: number;
  estimatedDurationMinutes?: number | null;
  checklist?: string | null;
  instructions?: string | null;
}

export interface UpdateMaintenancePlanRequest
  extends CreateMaintenancePlanRequest {
  isActive: boolean;
}

export interface CompleteMaintenanceOccurrenceRequest {
  scheduledForUtc?: string | null;
  scheduledMeterValue?: number | null;
  completedAtUtc?: string | null;
  completedByEmployeeId?: string | null;
  actualMinutes?: number | null;
  notes?: string | null;
}

export interface MaintenanceAutomationSyncDto {
  createdWorkOrdersCount: number;
  createdWorkOrderIds: string[];
}
