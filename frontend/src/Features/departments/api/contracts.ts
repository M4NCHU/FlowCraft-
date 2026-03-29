export interface DepartmentDto {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  valueStream?: string | null;
  isActive: boolean;
  employeesCount: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string | null;
  valueStream?: string | null;
}

export interface UpdateDepartmentRequest {
  name: string;
  code: string;
  description?: string | null;
  valueStream?: string | null;
  isActive: boolean;
}