import { useCallback, useEffect, useState } from "react";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { departmentsApi } from "../../departments/api/departmentsApi";
import type { DepartmentDto } from "../../departments/api/contracts";
import { employeesApi } from "../../employees/api/employeesApi";
import type { EmployeeDto } from "../../employees/api/contracts";
import { getHalls } from "../../halls/api/hallsApi";
import type { HallSummary } from "../../halls/model/model";
import {
  type FailureAnalyticsDto,
  type FailureReportDto,
} from "../../incidents/api/contracts";
import { failureReportsApi } from "../../incidents/api/failureReportsApi";
import type { ImprovementIdeaDto } from "../../lean/api/contracts";
import { improvementIdeasApi } from "../../lean/api/improvementIdeasApi";
import { assetCategoriesApi } from "../../machines/api/assetCategoriesApi";
import type { AssetCategoryDto, AssetListItemDto } from "../../machines/api/contracts";
import { AssetType } from "../../machines/api/contracts";
import { assetsApi } from "../../machines/api/assetsApi";
import { maintenancePlansApi } from "../../maintenance/api/maintenancePlansApi";
import type { MaintenancePlanDto } from "../../maintenance/api/contracts";
import { projectsApi } from "../../projects/api/projectsApi";
import type { ProjectSummary } from "../../projects/types";
import type { WorkOrderDto } from "../../work-orders/api/contracts";
import { workOrdersApi } from "../../work-orders/api/workOrdersApi";

type DashboardState = {
  projects: ProjectSummary[];
  departments: DepartmentDto[];
  halls: HallSummary[];
  assets: AssetListItemDto[];
  incidents: FailureReportDto[];
  incidentAnalytics: FailureAnalyticsDto | null;
  workOrders: WorkOrderDto[];
  improvementIdeas: ImprovementIdeaDto[];
  maintenancePlans: MaintenancePlanDto[];
  employees: EmployeeDto[];
  machineCategories: AssetCategoryDto[];
  loading: boolean;
  error: ApiError | null;
};

const initialState: DashboardState = {
  projects: [],
  departments: [],
  halls: [],
  assets: [],
  incidents: [],
  incidentAnalytics: null,
  workOrders: [],
  improvementIdeas: [],
  maintenancePlans: [],
  employees: [],
  machineCategories: [],
  loading: true,
  error: null,
};

export function useDashboardOverviewData() {
  const [state, setState] = useState<DashboardState>(initialState);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    const results = await Promise.allSettled([
      projectsApi.list({ signal }),
      departmentsApi.list({ includeInactive: false, signal }),
      getHalls(signal),
      assetsApi.list({ signal }),
      failureReportsApi.list({ openOnly: false, signal }),
      failureReportsApi.getAnalytics(signal),
      workOrdersApi.list(signal),
      improvementIdeasApi.list({ includeClosed: true, signal }),
      maintenancePlansApi.list({ includeInactive: true, signal }),
      employeesApi.list({ includeInactive: false, signal }),
      assetCategoriesApi.list({
        assetType: AssetType.Machine,
        includeInactive: false,
        signal,
      }),
    ]);

    if (signal?.aborted) return;

    const [
      projectsResult,
      departmentsResult,
      hallsResult,
      assetsResult,
      incidentsResult,
      analyticsResult,
      workOrdersResult,
      improvementIdeasResult,
      maintenancePlansResult,
      employeesResult,
      machineCategoriesResult,
    ] = results;

    const firstRejected = results.find((result) => result.status === "rejected");

    setState({
      projects:
        projectsResult.status === "fulfilled" ? (projectsResult.value ?? []) : [],
      departments:
        departmentsResult.status === "fulfilled"
          ? (departmentsResult.value ?? [])
          : [],
      halls: hallsResult.status === "fulfilled" ? (hallsResult.value ?? []) : [],
      assets: assetsResult.status === "fulfilled" ? (assetsResult.value ?? []) : [],
      incidents:
        incidentsResult.status === "fulfilled" ? (incidentsResult.value ?? []) : [],
      incidentAnalytics:
        analyticsResult.status === "fulfilled" ? analyticsResult.value : null,
      workOrders:
        workOrdersResult.status === "fulfilled"
          ? (workOrdersResult.value ?? [])
          : [],
      improvementIdeas:
        improvementIdeasResult.status === "fulfilled"
          ? (improvementIdeasResult.value ?? [])
          : [],
      maintenancePlans:
        maintenancePlansResult.status === "fulfilled"
          ? (maintenancePlansResult.value ?? [])
          : [],
      employees:
        employeesResult.status === "fulfilled" ? (employeesResult.value ?? []) : [],
      machineCategories:
        machineCategoriesResult.status === "fulfilled"
          ? (machineCategoriesResult.value ?? [])
          : [],
      loading: false,
      error: firstRejected
        ? toApiError(
            firstRejected.reason,
            "Nie udało się załadować części danych dashboardu."
          )
        : null,
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);

    return () => controller.abort();
  }, [loadData]);

  return {
    ...state,
    reload: () => loadData(),
  };
}
