import { useCallback, useState } from "react";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import type { CreateProjectRequest } from "../api/contracts";
import type { ProjectDetails } from "../types";
import { projectsApi } from "../api/projectsApi";

interface UseCreateProjectState {
  isCreating: boolean;
  error: ApiError | null;
}

export function useCreateProject(): UseCreateProjectState & {
  createProject: (payload: CreateProjectRequest) => Promise<ProjectDetails>;
} {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createProject = useCallback(
    async (payload: CreateProjectRequest): Promise<ProjectDetails> => {
      setIsCreating(true);
      setError(null);

      try {
        return await projectsApi.create(payload);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err);
          throw err;
        }
        const wrapped = toApiError(err, "Nie udało się utworzyc projektu.");
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  return { isCreating, error, createProject };
}
