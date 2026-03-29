import { useCallback, useState } from "react";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import type { UpdateProjectRequest } from "../api/contracts";
import type { ProjectDetails } from "../types";
import { projectsApi } from "../api/projectsApi";

interface UseUpdateProjectState {
  isUpdating: boolean;
  error: ApiError | null;
}

export function useUpdateProject(projectId: string): UseUpdateProjectState & {
  updateProject: (payload: UpdateProjectRequest) => Promise<ProjectDetails>;
} {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const updateProject = useCallback(
    async (payload: UpdateProjectRequest): Promise<ProjectDetails> => {
      setIsUpdating(true);
      setError(null);

      try {
        return await projectsApi.update(projectId, payload);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err);
          throw err;
        }
        const wrapped = toApiError(err, "Failed to update project");
        setError(wrapped);
        throw wrapped;
      } finally {
        setIsUpdating(false);
      }
    },
    [projectId]
  );

  return { isUpdating, error, updateProject };
}