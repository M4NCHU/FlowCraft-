import { useCallback, useEffect, useState } from "react";

import { getHalls } from "../api/hallsApi";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import type { HallSummary } from "./model";

export function useHallsList() {
  const [halls, setHalls] = useState<HallSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const reload = useCallback(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    getHalls(ac.signal)
      .then((data) => setHalls(data ?? []))
      .catch((e: unknown) => {
        if (ac.signal.aborted) {
          return;
        }
        setHalls([]);
        setError(toApiError(e, "Blad pobierania hal."));
        return;
        /*
        setError(
          e instanceof ApiError
            ? e
            : new ApiError(0, "Blad pobierania hal.", null)
        );
        */
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  useEffect(() => {
    const cleanup = reload();
    return cleanup;
  }, [reload]);

  return { halls, loading, error, reload };
}
