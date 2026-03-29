export interface RoleDto {
  id: string;
  name: string;
}

export interface CreateRoleRequest {
  name: string;
}

export interface AssignRoleRequest {
  userId: string;
  roleName: string;
}

export interface CreateRoleResponse {
  message: string;
  name: string;
}

export interface AssignRoleResponse {
  message: string;
}

export interface UserRolesResponse {
  userId: string;
  roles: string[];
}
