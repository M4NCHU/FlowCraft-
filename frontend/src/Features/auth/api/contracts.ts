export interface MeClaim {
  type: string;
  value: string;
}

export interface MeResponse {
  userId: string;
  name: string;
  tenantId?: string | null;
  claims: MeClaim[];
}

export interface LoginRequest {
  userNameOrEmail: string;
  password: string;
}

export interface LoginResponse {
  expiresAtUtc: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  tenantId?: string | null;
  role?: string | null;
  signIn?: boolean;
}

export interface RegisterResponse {
  userId: string;
  userName: string;
  email: string;
  tenantId?: string | null;
  expiresAtUtc?: string | null;
}
