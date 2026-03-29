import { useCallback, useEffect, useState } from "react";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import type { ListProjectsRequest } from "../api/contracts";
import type { ProjectSummary } from "../types";
import { projectsApi } from "../api/projectsApi";

export interface ProjectsListFilter extends ListProjectsRequest {
  search?: string;
}

interface UseProjectsListState {
  projects: ProjectSummary[];
  isLoading: boolean;
  error: ApiError | null;
}

export function useProjectsList(
  filter: ProjectsListFilter
): UseProjectsListState & {
  reload: () => Promise<void>;
} {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await projectsApi.list(filter);
      const search = filter.search?.trim().toLowerCase();
      const filtered = !search
        ? data
        : data.filter((project) => {
            const haystack = `${project.name} ${project.description ?? ""}`.toLowerCase();
            return haystack.includes(search);
          });
      setProjects(Array.isArray(filtered) ? filtered : []);
    } catch (err) {
      setError(toApiError(err, "Failed to load projects"));
    } finally {
      setIsLoading(false);
    }
  }, [filter.search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { projects, isLoading, error, reload };
}
