export const EmployeeStatus = {
  Active: 1,
  OnLeave: 2,
  Suspended: 3,
  Terminated: 4,
} as const;

export type EmployeeStatus =
  (typeof EmployeeStatus)[keyof typeof EmployeeStatus];

export const EmployeeSkillLevel = {
  Beginner: 1,
  Independent: 2,
  Advanced: 3,
  Trainer: 4,
} as const;

export type EmployeeSkillLevel =
  (typeof EmployeeSkillLevel)[keyof typeof EmployeeSkillLevel];

export interface EmployeeSkillDto {
  id: string;
  assetCategoryId: string;
  assetCategoryName: string;
  assetId?: string | null;
  assetName?: string | null;
  isMachineSpecific: boolean;
  scopeLabel: string;
  assetType: number;
  skillLevel: EmployeeSkillLevel;
  canOperate: boolean;
  canMaintain: boolean;
  canApproveMaintenance: boolean;
  notes?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface EmployeeAssignedAssetDto {
  assetId: string;
  assetName: string;
  assetCode: string;
  assetCategoryName?: string | null;
  assignedAtUtc: string;
  dueBackAtUtc?: string | null;
}

export interface EmployeeDto {
  id: string;
  userId?: string | null;
  departmentId?: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  departmentName?: string | null;
  phone?: string | null;
  notes?: string | null;
  status: EmployeeStatus;
  isActive: boolean;
  hireDateUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
  skills: EmployeeSkillDto[];
  assignedAssets: EmployeeAssignedAssetDto[];
}

export interface CreateEmployeeRequest {
  departmentId?: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  phone?: string | null;
  hireDateUtc?: string | null;
  userId?: string | null;
  notes?: string | null;
}

export interface UpdateEmployeeRequest {
  departmentId?: string | null;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  status: EmployeeStatus;
  jobTitle?: string | null;
  phone?: string | null;
  hireDateUtc?: string | null;
  userId?: string | null;
  notes?: string | null;
}

export interface UpsertEmployeeSkillRequest {
  assetCategoryId: string;
  assetId?: string | null;
  skillLevel: EmployeeSkillLevel;
  canOperate: boolean;
  canMaintain: boolean;
  canApproveMaintenance: boolean;
  notes?: string | null;
}

export interface ReplaceEmployeeSkillsRequest {
  skills: UpsertEmployeeSkillRequest[];
}
