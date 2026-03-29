export interface CreateTenantRequest {
  name: string;
  code?: string | null;
  email: string;
  userName: string;
  password: string;
}

export interface UpdateTenantRequest {
  name: string;
  code?: string | null;
}
