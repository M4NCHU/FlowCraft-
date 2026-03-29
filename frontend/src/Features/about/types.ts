export interface TenantDto {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export type TenantDetails = TenantDto;
