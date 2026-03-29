export const FailureSeverity = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;

export type FailureSeverity =
  (typeof FailureSeverity)[keyof typeof FailureSeverity];

export const FailureStatus = {
  Open: 1,
  Triaged: 2,
  InProgress: 3,
  Resolved: 4,
  Closed: 5,
} as const;

export type FailureStatus =
  (typeof FailureStatus)[keyof typeof FailureStatus];

export interface FailureCauseCategoryDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
  incidentsCount: number;
  totalDowntimeMinutes: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface FailureParetoItemDto {
  failureCauseCategoryId?: string | null;
  causeName: string;
  incidentsCount: number;
  totalDowntimeMinutes: number;
  share: number;
  cumulativeShare: number;
}

export interface FailureAnalyticsDto {
  openIncidentsCount: number;
  totalIncidentsCount: number;
  downtimeIncidentsCount: number;
  totalDowntimeMinutes: number;
  mttrHours?: number | null;
  mtbfHours?: number | null;
  pareto: FailureParetoItemDto[];
}

export interface FailureReportDto {
  id: string;
  assetId?: string | null;
  hallId?: string | null;
  sectionId?: string | null;
  reportedByEmployeeId?: string | null;
  failureCauseCategoryId?: string | null;
  failureCauseCategoryName?: string | null;
  title: string;
  description: string;
  severity: FailureSeverity;
  status: FailureStatus;
  causesDowntime: boolean;
  reportedAtUtc: string;
  downtimeStartedAtUtc?: string | null;
  downtimeEndedAtUtc?: string | null;
  downtimeMinutes?: number | null;
  productionLossUnits?: number | null;
  triagedAtUtc?: string | null;
  resolvedAtUtc?: string | null;
  closedAtUtc?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  resolutionSummary?: string | null;
  workOrderIds: string[];
}

export interface CreateFailureReportRequest {
  title: string;
  description: string;
  severity: FailureSeverity;
  causesDowntime: boolean;
  assetId?: string | null;
  hallId?: string | null;
  sectionId?: string | null;
  reportedByEmployeeId?: string | null;
  failureCauseCategoryId?: string | null;
  downtimeStartedAtUtc?: string | null;
  downtimeEndedAtUtc?: string | null;
  productionLossUnits?: number | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
}

export interface UpdateFailureReportRequest {
  title: string;
  description: string;
  severity: FailureSeverity;
  causesDowntime: boolean;
  failureCauseCategoryId?: string | null;
  downtimeStartedAtUtc?: string | null;
  downtimeEndedAtUtc?: string | null;
  productionLossUnits?: number | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  resolutionSummary?: string | null;
}

export interface SetFailureReportStatusRequest {
  status: FailureStatus;
  resolutionSummary?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  preventiveAction?: string | null;
  failureCauseCategoryId?: string | null;
  downtimeEndedAtUtc?: string | null;
  productionLossUnits?: number | null;
}

export interface CreateFailureCauseCategoryRequest {
  name: string;
  code: string;
  description?: string | null;
}

export interface UpdateFailureCauseCategoryRequest {
  name: string;
  code: string;
  description?: string | null;
  isActive: boolean;
}
