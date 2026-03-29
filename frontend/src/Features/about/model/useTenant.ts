import { useCallback, useEffect, useRef, useState } from "react";
import type { TenantDto } from "../types";
import { tenantsApi } from "../api/tenantsApi";

type State =
  | { status: "idle" | "loading"; data: TenantDto | null; error: null }
  | { status: "success"; data: TenantDto; error: null }
  | { status: "error"; data: null; error: string };

export function useTenant() {
  const [state, setState] = useState<State>({
    status: "idle",
    data: null,
    error: null,
  });

  const lastAbort = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    lastAbort.current?.abort();
    const ac = new AbortController();
    lastAbort.current = ac;

    setState({ status: "loading", data: null, error: null });

    try {
      const dto = await tenantsApi.getMe(ac.signal);
      setState({ status: "success", data: dto, error: null });
    } catch (e) {
      if (ac.signal.aborted) return;
      const msg = e instanceof Error ? e.message : "Unknown error";
      setState({ status: "error", data: null, error: msg });
    }
  }, []);

  useEffect(() => {
    load();
    return () => lastAbort.current?.abort();
  }, [load]);

  return { ...state, refresh: load };
}
