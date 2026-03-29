import { apiGet, apiPost, apiPut } from "../../../shared/api/httpClient";
import type {
  CreateImprovementIdeaRequest,
  ImprovementIdeaDto,
  SetImprovementIdeaStatusRequest,
  UpdateImprovementIdeaRequest,
} from "./contracts";

export interface ImprovementIdeasListParams {
  includeClosed?: boolean;
  signal?: AbortSignal;
}

export const improvementIdeasApi = {
  list: ({ includeClosed = true, signal }: ImprovementIdeasListParams = {}) =>
    apiGet<ImprovementIdeaDto[]>("/api/improvement-ideas", {
      signal,
      withAuth: true,
      query: { includeClosed },
    }),

  getById: (ideaId: string, signal?: AbortSignal) =>
    apiGet<ImprovementIdeaDto>(`/api/improvement-ideas/${ideaId}`, {
      signal,
      withAuth: true,
    }),

  create: (body: CreateImprovementIdeaRequest, signal?: AbortSignal) =>
    apiPost<ImprovementIdeaDto, CreateImprovementIdeaRequest>(
      "/api/improvement-ideas",
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Pomysł usprawnienia został dodany.",
      }
    ),

  update: (
    ideaId: string,
    body: UpdateImprovementIdeaRequest,
    signal?: AbortSignal
  ) =>
    apiPut<ImprovementIdeaDto, UpdateImprovementIdeaRequest>(
      `/api/improvement-ideas/${ideaId}`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Pomysł usprawnienia został zaktualizowany.",
      }
    ),

  setStatus: (
    ideaId: string,
    body: SetImprovementIdeaStatusRequest,
    signal?: AbortSignal
  ) =>
    apiPost<ImprovementIdeaDto, SetImprovementIdeaStatusRequest>(
      `/api/improvement-ideas/${ideaId}/status`,
      body,
      {
        signal,
        withAuth: true,
        notifyOnSuccess: true,
        successMessage: "Status usprawnienia został zmieniony.",
      }
    ),
};
