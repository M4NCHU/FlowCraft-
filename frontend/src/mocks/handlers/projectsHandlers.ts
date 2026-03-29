import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { assetsApi } from "../../machines/api/assetsApi";
import { AssetType, type AssetListItemDto } from "../../machines/api/contracts";
import { workOrdersApi } from "../api/workOrdersApi";
import {
  WorkOrderPriority,
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

  const priorityLabel = (priority: WorkOrderPriority) => {
    if (priority === WorkOrderPriority.Critical) return "Krytyczny";
    if (priority === WorkOrderPriority.High) return "Wysoki";
    if (priority === WorkOrderPriority.Medium) return "Średni";
    return "Niski";
  };

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

      {loading && (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow">
          Ładowanie zleceń serwisowych...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error.message}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.key} className="rounded-xl bg-white p-4 shadow">
              <div className="mb-3 text-xs font-medium uppercase">
                {column.label}
              </div>
              <div className="flex flex-col gap-3">
                {grouped[column.key].map((workOrder) => (
                  <Link
                    key={workOrder.id}
                    to={`/work-orders/${workOrder.id}`}
                    className="rounded-lg border p-3 hover:bg-slate-50"
                  >
                    <div className="font-medium">{workOrder.title}</div>
                    <div className="text-xs text-slate-600">
                      {workOrder.number}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {assetName(workOrder.assetId)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Priorytet: {priorityLabel(workOrder.priority)}
                    </div>
                  </Link>
                ))}

                {grouped[column.key].length === 0 && (
                  <div className="rounded-lg border border-dashed p-3 text-xs text-slate-500">
                    Brak zleceń w tej kolumnie.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddWorkOrderModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        assets={assets}
        onCreated={handleCreated}
      />
    </>
  );
}
