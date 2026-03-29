export const ImprovementCategory = {
  Kaizen: 1,
  FiveS: 2,
  StandardWork: 3,
  Flow: 4,
  Safety: 5,
  Quality: 6,
} as const;

export type ImprovementCategory =
  (typeof ImprovementCategory)[keyof typeof ImprovementCategory];

export const LeanWasteType = {
  Transport: 1,
  Inventory: 2,
  Motion: 3,
  Waiting: 4,
  Overproduction: 5,
  Overprocessing: 6,
  Defects: 7,
  UnusedTalent: 8,
} as const;

export type LeanWasteType =
  (typeof LeanWasteType)[keyof typeof LeanWasteType];

export const ImprovementStatus = {
  New: 1,
  InReview: 2,
  Approved: 3,
  InProgress: 4,
  Implemented: 5,
  Rejected: 6,
} as const;

export type ImprovementStatus =
  (typeof ImprovementStatus)[keyof typeof ImprovementStatus];

export const ImprovementImpact = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
} as const;

export type ImprovementImpact =
  (typeof ImprovementImpact)[keyof typeof ImprovementImpact];

export interface ImprovementIdeaDto {
  id: string;
  departmentId?: string | null;
  departmentName?: string | null;
  ownerEmployeeId?: string | null;
  ownerEmployeeName?: string | null;
  title: string;
  description: string;
  category: ImprovementCategory;
  wasteType: LeanWasteType;
  status: ImprovementStatus;
  impact: ImprovementImpact;
  quickWin: boolean;
  rootCause?: string | null;
  proposedAction?: string | null;
  baselineMetricName?: string | null;
  metricUnit?: string | null;
  baselineValue?: number | null;
  targetValue?: number | null;
  actualValue?: number | null;
  estimatedSavingsPerMonth?: number | null;
  implementedSavingsPerMonth?: number | null;
  resultSummary?: string | null;
  improvementPercent?: number | null;
  targetAchievementPercent?: number | null;
  priorityScore: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  dueDateUtc?: string | null;
  implementedAtUtc?: string | null;
  notes?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateImprovementIdeaRequest {
  departmentId?: string | null;
  ownerEmployeeId?: string | null;
  title: string;
  description: string;
  category: ImprovementCategory;
  wasteType: LeanWasteType;
  impact: ImprovementImpact;
  quickWin: boolean;
  proposedAction?: string | null;
  baselineMetricName?: string | null;
  metricUnit?: string | null;
  baselineValue?: number | null;
  targetValue?: number | null;
  estimatedSavingsPerMonth?: number | null;
  dueDateUtc?: string | null;
  notes?: string | null;
}

export interface UpdateImprovementIdeaRequest {
  departmentId?: string | null;
  ownerEmployeeId?: string | null;
  title: string;
  description: string;
  category: ImprovementCategory;
  wasteType: LeanWasteType;
  impact: ImprovementImpact;
  quickWin: boolean;
  rootCause?: string | null;
  proposedAction?: string | null;
  baselineMetricName?: string | null;
  metricUnit?: string | null;
  baselineValue?: number | null;
  targetValue?: number | null;
  actualValue?: number | null;
  estimatedSavingsPerMonth?: number | null;
  implementedSavingsPerMonth?: number | null;
  resultSummary?: string | null;
  dueDateUtc?: string | null;
  notes?: string | null;
}

export interface SetImprovementIdeaStatusRequest {
  status: ImprovementStatus;
  notes?: string | null;
}
