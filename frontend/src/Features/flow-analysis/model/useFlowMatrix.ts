import { useCallback, useEffect, useMemo, useState } from "react";
import {
  toApiError,
  type ApiError,
} from "../../../shared/api/httpClient";
import { employeesApi } from "../../employees/api/employeesApi";
import type { EmployeeDto } from "../../employees/api/contracts";
import {
  calculateFlowMetrics,
  type FlowMetricsSummary,
} from "../lib/flowMetrics";

interface FlowMatrixState {
  employees: EmployeeDto[];
  loading: boolean;
  error: ApiError | null;
}

const initialState: FlowMatrixState = {
  employees: [],
  loading: true,
  error: null,
};

export function useFlowMatrix() {
  const [state, setState] = useState<FlowMatrixState>(initialState);

  const loadEmployees = useCallback(async (signal?: AbortSignal) => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const employees = await employeesApi.list({
        includeInactive: false,
        signal,
      });

      if (signal?.aborted) return;

      setState({
        employees: employees ?? [],
        loading: false,
        error: null,
      });
    } catch (error) {
      if (signal?.aborted) return;

      setState({
        employees: [],
        loading: false,
        error: toApiError(error, "Nie udało się pobrać danych do analizy przepływu."),
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadEmployees(controller.signal);

    return () => controller.abort();
  }, [loadEmployees]);

  const summary = useMemo<FlowMetricsSummary>(
    () => calculateFlowMetrics(state.employees),
    [state.employees],
  );

  return {
    ...state,
    summary,
    reload: () => loadEmployees(),
  };
}
