import { useCallback, useState } from "react";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import type { UpdateTenantRequest } from "../api/contracts";
import type { TenantDetails } from "../types";
import { tenantsApi } from "../api/tenantsApi";

interface UseUpdateTenantState {
  isUpdating: boolean;
  error: ApiError | null;
}

export function useUpdateTenant(): UseUpdateTenantState & {
  updateTenant: (payload: UpdateTenantRequest) => Promise<TenantDetails>;
} {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const updateTenant = useCallback(async (payload: UpdateTenantRequest) => {
    setIsUpdating(true);
    setError(null);

    try {
      return await tenantsApi.updateMe(payload);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
        throw err;
      }
      const wrapped = toApiError(err, "Failed to update tenant");
      setError(wrapped);
      throw wrapped;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return { isUpdating, error, updateTenant };
}
