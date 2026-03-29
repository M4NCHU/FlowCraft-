import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../../../shared/api/httpClient";
import type { ProjectDetails, ProjectSummary } from "../types";
import type {
  CreateProjectRequest,
  ListProjectsRequest,
  UpdateProjectRequest,
} from "./contracts";

export interface ProjectsListParams extends ListProjectsRequest {
  signal?: AbortSignal;
}

function buildProjectsQuery(params: ListProjectsRequest) {
  const query: Record<string, string> = {};

  if (params.search && params.search.trim()) {
    query.search = params.search.trim();
  }

  return query;
}

export const projectsApi = {
  list: ({ search, signal }: ProjectsListParams = {}) =>
    apiGet<ProjectSummary[]>("/api/projects", {
      signal,
      query: buildProjectsQuery({ search }),
      withAuth: true,
    }),

  getById: (projectId: string, signal?: AbortSignal) =>
    apiGet<ProjectDetails>(`/api/projects/${projectId}`, {
      signal,
      withAuth: true,
    }),

  create: (body: CreateProjectRequest, signal?: AbortSignal) =>
    apiPost<ProjectDetails, CreateProjectRequest>("/api/projects", body, {
      signal,
      withAuth: true,
      notifyOnSuccess: true,
      successMessage: "Projekt został utworzony.",
    }),

  update: (
    projectId: string,
    body: UpdateProjectRequest,
    signal?: AbortSignal
  ) =>
    apiPut<ProjectDetails, UpdateProjectRequest>(
      `/api/projects/${projectId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Projekt został zaktualizowany.",
      }
    ),

  delete: (projectId: string, signal?: AbortSignal) =>
    apiDelete<void>(`/api/projects/${projectId}`, {
      signal,
      withAuth: true,
      responseType: "void",
      notifyOnSuccess: true,
      successMessage: "Projekt został usunięty.",
    }),
};
