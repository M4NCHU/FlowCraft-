import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { employeesApi } from "../../employees/api/employeesApi";
import type { EmployeeDto } from "../../employees/api/contracts";
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
  { key: "new", label: "Nowe", hint: "Do przypisania" },
  { key: "inProgress", label: "W realizacji", hint: "Aktywna praca" },
  { key: "done", label: "Zamknięte", hint: "Wykonane i anulowane" },
] as const;

type ColumnKey = (typeof columns)[number]["key"];
type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";
type PriorityFilter = "all" | "critical" | "high" | "medium" | "low";
type SourceFilter = "all" | "auto" | "failure" | "preventive" | "manual";

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    slate: "border-slate-800 bg-slate-950/60 text-slate-100",
    cyan: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
    rose: "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
    violet: "border-violet-400/25 bg-violet-400/[0.08] text-violet-100",
  };

  return classes[tone];
}

export function WorkOrdersBoardPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrderDto[]>([]);
  const [assets, setAssets] = useState<AssetListItemDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<WorkOrderDto | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const loadData = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const [orders, machines, employeeData] = await Promise.all([
        workOrdersApi.list(signal),
        assetsApi.list({ signal }),
        employeesApi.list({ includeInactive: false, signal }),
      ]);

      setWorkOrders(orders ?? []);
      setAssets(
        (machines ?? []).filter((asset) => asset.type === AssetType.Machine),
      );
      setEmployees(employeeData ?? []);
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

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset] as const)),
    [assets],
  );

  const assetName = (assetId?: string | null) =>
    assetId
      ? (assetsById.get(assetId)?.name ?? "Brak maszyny")
      : "Brak maszyny";

  const handleSaved = (workOrder: WorkOrderDto) => {
    setWorkOrders((prev) => [
      workOrder,
      ...prev.filter((item) => item.id !== workOrder.id),
    ]);
  };

  const filteredWorkOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return workOrders.filter((workOrder) => {
      if (
        priorityFilter !== "all" &&
        !matchesPriority(workOrder, priorityFilter)
      ) {
        return false;
      }

      if (sourceFilter !== "all" && !matchesSource(workOrder, sourceFilter)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        workOrder.title,
        workOrder.number,
        assetName(workOrder.assetId),
        sourceLabel(workOrder),
        priorityLabel(workOrder.priority),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [priorityFilter, search, sourceFilter, workOrders, assetsById]);

  const grouped = useMemo(() => {
    const initial: Record<ColumnKey, WorkOrderDto[]> = {
      new: [],
      inProgress: [],
      done: [],
    };

    filteredWorkOrders.forEach((workOrder) => {
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

    Object.values(initial).forEach((items) => {
      items.sort((left, right) => {
        const priorityDiff =
          priorityRank(right.priority) - priorityRank(left.priority);
        if (priorityDiff !== 0) return priorityDiff;

        const leftDate = Date.parse(left.dueAtUtc ?? left.requestedAtUtc);
        const rightDate = Date.parse(right.dueAtUtc ?? right.requestedAtUtc);

        return leftDate - rightDate;
      });
    });

    return initial;
  }, [filteredWorkOrders]);

  const metrics = useMemo(() => {
    const active = workOrders.filter(
      (workOrder) =>
        workOrder.status !== WorkOrderStatus.Done &&
        workOrder.status !== WorkOrderStatus.Cancelled,
    );

    const critical = active.filter(
      (workOrder) => workOrder.priority === WorkOrderPriority.Critical,
    );

    const waitingForParts = active.filter(
      (workOrder) => workOrder.status === WorkOrderStatus.WaitingForParts,
    );

    const autoCreated = active.filter((workOrder) => workOrder.autoCreated);

    return {
      all: workOrders.length,
      active: active.length,
      critical: critical.length,
      waitingForParts: waitingForParts.length,
      autoCreated: autoCreated.length,
      filtered: filteredWorkOrders.length,
    };
  }, [filteredWorkOrders.length, workOrders]);

  return (
    <>
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Operacje
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {metrics.active} aktywnych
                  </span>

                  {metrics.critical > 0 ? (
                    <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                      {metrics.critical} krytyczne
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Zlecenia serwisowe
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Tablica pracy utrzymania ruchu: nowe zgłoszenia, zadania w
                  realizacji i zamknięte zlecenia. Najważniejsze są zlecenia
                  krytyczne, auto-zlecenia i sprawy czekające na części.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link
                  to="/machines"
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Maszyny
                </Link>

                <Link
                  to="/incidents"
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Awarie
                </Link>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Odśwież
                </button>

                <button
                  type="button"
                  onClick={() => setOpenAdd(true)}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Dodaj zlecenie
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <SummaryCard
                label="Wszystkie"
                value={String(metrics.all)}
                hint="Łącznie"
              />

              <SummaryCard
                label="Aktywne"
                value={String(metrics.active)}
                hint="Do obsłużenia"
                tone="cyan"
              />

              <SummaryCard
                label="Krytyczne"
                value={String(metrics.critical)}
                hint="Najwyższy priorytet"
                tone={metrics.critical > 0 ? "rose" : "slate"}
              />

              <SummaryCard
                label="Czeka na części"
                value={String(metrics.waitingForParts)}
                hint="Blokada magazynu"
                tone={metrics.waitingForParts > 0 ? "amber" : "slate"}
              />

              <SummaryCard
                label="Auto-zlecenia"
                value={String(metrics.autoCreated)}
                hint="Z harmonogramu"
                tone={metrics.autoCreated > 0 ? "violet" : "slate"}
              />

              <SummaryCard
                label="Po filtrach"
                value={String(metrics.filtered)}
                hint="Widoczne na tablicy"
                tone="emerald"
              />
            </div>
          </section>

          {error && !loading ? (
            <div className="shrink-0 rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-2 text-sm text-rose-100">
              {error.message}
            </div>
          ) : null}

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Tablica zleceń
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Kolumny mają własne przewijanie, więc cały ekran nie
                    rozjeżdża się przy większej liczbie zleceń.
                  </p>
                </div>

                <div className="grid gap-2 md:grid-cols-3 xl:min-w-[44rem]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Szukaj po numerze, tytule, maszynie..."
                    className={inputClassName}
                  />

                  <select
                    value={priorityFilter}
                    onChange={(event) =>
                      setPriorityFilter(event.target.value as PriorityFilter)
                    }
                    className={inputClassName}
                  >
                    <option value="all">Wszystkie priorytety</option>
                    <option value="critical">Krytyczne</option>
                    <option value="high">Wysokie</option>
                    <option value="medium">Średnie</option>
                    <option value="low">Niskie</option>
                  </select>

                  <select
                    value={sourceFilter}
                    onChange={(event) =>
                      setSourceFilter(event.target.value as SourceFilter)
                    }
                    className={inputClassName}
                  >
                    <option value="all">Wszystkie źródła</option>
                    <option value="auto">Auto-zlecenia</option>
                    <option value="failure">Z awarii</option>
                    <option value="preventive">Prewencyjne</option>
                    <option value="manual">Manualne</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">
                  Ładowanie zleceń serwisowych...
                </div>
              ) : null}

              {!loading && !error ? (
                <div className="grid h-full min-h-0 gap-3 md:grid-cols-3">
                  {columns.map((column) => (
                    <BoardColumn
                      key={column.key}
                      column={column}
                      items={grouped[column.key]}
                      assetName={assetName}
                      onEdit={setEditingWorkOrder}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <AddWorkOrderModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        assets={assets}
        employees={employees}
        onSaved={handleSaved}
      />

      <AddWorkOrderModal
        open={!!editingWorkOrder}
        onClose={() => setEditingWorkOrder(null)}
        assets={assets}
        employees={employees}
        workOrder={editingWorkOrder}
        onSaved={handleSaved}
      />
    </>
  );
}

function BoardColumn({
  column,
  items,
  assetName,
  onEdit,
}: {
  column: (typeof columns)[number];
  items: WorkOrderDto[];
  assetName: (assetId?: string | null) => string;
  onEdit: (workOrder: WorkOrderDto) => void;
}) {
  const columnTone: Record<ColumnKey, Tone> = {
    new: "cyan",
    inProgress: "amber",
    done: "emerald",
  };

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/70 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
              {column.label}
            </h3>

            <p className="mt-1 text-xs text-slate-500">{column.hint}</p>
          </div>

          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${toneClass(
              columnTone[column.key],
            )}`}
          >
            {items.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="space-y-2">
          {items.map((workOrder) => (
            <WorkOrderCard
              key={workOrder.id}
              workOrder={workOrder}
              assetName={assetName(workOrder.assetId)}
              onEdit={() => onEdit(workOrder)}
            />
          ))}

          {items.length === 0 ? (
            <EmptyState text="Brak zleceń w tej kolumnie." />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WorkOrderCard({
  workOrder,
  assetName,
  onEdit,
}: {
  workOrder: WorkOrderDto;
  assetName: string;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-white">
            {workOrder.title}
          </div>

          <div className="mt-1 text-xs text-slate-500">{workOrder.number}</div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge tone={priorityTone(workOrder.priority)}>
            {priorityLabel(workOrder.priority)}
          </Badge>

          <Badge tone={workOrder.autoCreated ? "amber" : "cyan"}>
            {sourceLabel(workOrder)}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-400">
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Maszyna</span>
          <span className="line-clamp-1 text-right font-medium text-slate-300">
            {assetName}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Termin</span>
          <span className="text-right font-medium text-slate-300">
            {formatDateTime(workOrder.dueAtUtc ?? workOrder.requestedAtUtc)}
          </span>
        </div>

        {workOrder.triggeredByMeterValue != null ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Licznik</span>
            <span className="text-right font-medium text-slate-300">
              {workOrder.triggeredByMeterValue}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/work-orders/${workOrder.id}`}
          className={primaryCompactButtonClassName}
        >
          Szczegóły
        </Link>

        <button
          type="button"
          onClick={onEdit}
          className={compactButtonClassName}
        >
          Edytuj
        </button>

        {workOrder.assetId ? (
          <Link
            to={`/machines/${workOrder.assetId}`}
            className={compactButtonClassName}
          >
            Maszyna
          </Link>
        ) : null}

        {workOrder.failureReportId ? (
          <Link
            to={`/incidents/${workOrder.failureReportId}`}
            className={compactButtonClassName}
          >
            Awaria
          </Link>
        ) : null}

        {workOrder.maintenancePlanId ? (
          <Link
            to={`/maintenance?planId=${encodeURIComponent(workOrder.maintenancePlanId)}`}
            className={compactButtonClassName}
          >
            Plan
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-65">
        {label}
      </div>

      <div className="mt-1 truncate text-lg font-bold leading-none">
        {value}
      </div>

      <div className="mt-1 truncate text-xs opacity-70">{hint}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
        tone,
      )}`}
    >
      {children}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-3 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}

const inputClassName =
  "rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";

const compactButtonClassName =
  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const primaryCompactButtonClassName =
  "rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]";

function priorityLabel(priority: WorkOrderPriority) {
  if (priority === WorkOrderPriority.Critical) return "Krytyczny";
  if (priority === WorkOrderPriority.High) return "Wysoki";
  if (priority === WorkOrderPriority.Medium) return "Średni";

  return "Niski";
}

function priorityTone(priority: WorkOrderPriority): Tone {
  if (priority === WorkOrderPriority.Critical) return "rose";
  if (priority === WorkOrderPriority.High) return "amber";
  if (priority === WorkOrderPriority.Medium) return "cyan";

  return "slate";
}

function priorityRank(priority: WorkOrderPriority) {
  if (priority === WorkOrderPriority.Critical) return 4;
  if (priority === WorkOrderPriority.High) return 3;
  if (priority === WorkOrderPriority.Medium) return 2;

  return 1;
}

function sourceLabel(workOrder: WorkOrderDto) {
  if (workOrder.autoCreated) return "Auto-zlecenie";
  if (workOrder.source === WorkOrderSource.FailureReport) return "Z awarii";
  if (workOrder.source === WorkOrderSource.PreventiveMaintenance) {
    return "Prewencyjne";
  }

  return "Manualne";
}

function matchesPriority(workOrder: WorkOrderDto, filter: PriorityFilter) {
  if (filter === "critical") {
    return workOrder.priority === WorkOrderPriority.Critical;
  }

  if (filter === "high") {
    return workOrder.priority === WorkOrderPriority.High;
  }

  if (filter === "medium") {
    return workOrder.priority === WorkOrderPriority.Medium;
  }

  if (filter === "low") {
    return workOrder.priority === WorkOrderPriority.Low;
  }

  return true;
}

function matchesSource(workOrder: WorkOrderDto, filter: SourceFilter) {
  if (filter === "auto") {
    return workOrder.autoCreated;
  }

  if (filter === "failure") {
    return workOrder.source === WorkOrderSource.FailureReport;
  }

  if (filter === "preventive") {
    return workOrder.source === WorkOrderSource.PreventiveMaintenance;
  }

  if (filter === "manual") {
    return workOrder.source === WorkOrderSource.Manual;
  }

  return true;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
