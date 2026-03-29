import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { OperationalStatusBadge } from "../../../shared/ui/OperationalStatusBadge";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { assetsApi } from "../../machines/api/assetsApi";
import { AssetType, type AssetListItemDto } from "../../machines/api/contracts";
import { workOrdersApi } from "../api/workOrdersApi";
import {
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
  type WorkOrderDto,
} from "../api/contracts";
import { AddWorkOrderModal } from "./components/AddWorkOrderModal";

const columns = [
  { key: "new", label: "Nowe" },
  { key: "inProgress", label: "W realizacji" },
  { key: "done", label: "Zamknięte" },
] as const;

export function WorkOrdersBoardPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderDto[]>([]);
  const [assets, setAssets] = useState<AssetListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  const loadData = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const [orders, machines] = await Promise.all([
        workOrdersApi.list(signal),
        assetsApi.list({ signal }),
      ]);

      setWorkOrders(orders ?? []);
      setAssets(
        (machines ?? []).filter((asset) => asset.type === AssetType.Machine)
      );
    } catch (err) {
      if (signal?.aborted) return;
      setError(toApiError(err, "Nie udało się pobrać zleceń serwisowych."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);

    return () => controller.abort();
  }, []);

  const assetName = (assetId?: string | null) =>
    assets.find((asset) => asset.id === assetId)?.name ?? "Brak maszyny";

  const handleCreated = (workOrder: WorkOrderDto) => {
    setWorkOrders((prev) => [workOrder, ...prev]);
  };

  const grouped = useMemo(() => {
    const initial: Record<(typeof columns)[number]["key"], WorkOrderDto[]> = {
      new: [],
      inProgress: [],
      done: [],
    };

    workOrders.forEach((workOrder) => {
      if (
        workOrder.status === WorkOrderStatus.New ||
        workOrder.status === WorkOrderStatus.Assigned
      ) {
        initial.new.push(workOrder);
        return;
      }

      if (
        workOrder.status === WorkOrderStatus.InProgress ||
        workOrder.status === WorkOrderStatus.WaitingForParts
      ) {
        initial.inProgress.push(workOrder);
        return;
      }

      initial.done.push(workOrder);
    });

    return initial;
  }, [workOrders]);

  return (
    <>
      <PageHeader
        title="Zlecenia serwisowe"
        extra={
          <div className="flex items-center gap-3">
            <Link
              to="/machines"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Maszyny
            </Link>
            <Link
              to="/incidents"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Awarie
            </Link>
            <button
              onClick={() => void loadData()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj zlecenie
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow">
          Ładowanie zleceń serwisowych...
        </div>
      ) : null}

      {error && !loading ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error.message}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.key} className="rounded-xl bg-white p-4 shadow">
              <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                {column.label}
              </div>
              <div className="flex flex-col gap-3">
                {grouped[column.key].map((workOrder) => (
                  <div key={workOrder.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{workOrder.title}</div>
                        <div className="text-xs text-slate-600">{workOrder.number}</div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <OperationalStatusBadge
                          label={priorityLabel(workOrder.priority)}
                          tone={priorityTone(workOrder.priority)}
                        />
                        <OperationalStatusBadge
                          label={sourceLabel(workOrder)}
                          tone={workOrder.autoCreated ? "warning" : "info"}
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-slate-500">
                      Maszyna: {assetName(workOrder.assetId)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Termin: {formatDateTime(workOrder.dueAtUtc ?? workOrder.requestedAtUtc)}
                    </div>
                    {workOrder.triggeredByMeterValue != null ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Trigger licznika: {workOrder.triggeredByMeterValue}
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to={`/work-orders/${workOrder.id}`}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Szczegóły
                      </Link>
                      {workOrder.assetId ? (
                        <Link
                          to={`/machines/${workOrder.assetId}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Maszyna
                        </Link>
                      ) : null}
                      {workOrder.failureReportId ? (
                        <Link
                          to={`/incidents/${workOrder.failureReportId}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Awaria
                        </Link>
                      ) : null}
                      {workOrder.maintenancePlanId ? (
                        <Link
                          to={`/maintenance?planId=${encodeURIComponent(workOrder.maintenancePlanId)}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Plan
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}

                {grouped[column.key].length === 0 ? (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-slate-500">
                    Brak zleceń w tej kolumnie.
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <AddWorkOrderModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        assets={assets}
        onCreated={handleCreated}
      />
    </>
  );
}

function priorityLabel(priority: WorkOrderPriority) {
  if (priority === WorkOrderPriority.Critical) return "Krytyczny";
  if (priority === WorkOrderPriority.High) return "Wysoki";
  if (priority === WorkOrderPriority.Medium) return "Średni";
  return "Niski";
}

function priorityTone(priority: WorkOrderPriority) {
  if (priority === WorkOrderPriority.Critical) return "danger" as const;
  if (priority === WorkOrderPriority.High) return "warning" as const;
  if (priority === WorkOrderPriority.Medium) return "info" as const;
  return "neutral" as const;
}

function sourceLabel(workOrder: WorkOrderDto) {
  if (workOrder.autoCreated) return "Auto-zlecenie";
  if (workOrder.source === WorkOrderSource.FailureReport) return "Z awarii";
  if (workOrder.source === WorkOrderSource.PreventiveMaintenance) return "Prewencyjne";
  return "Manualne";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
