import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { FailureSeverity, FailureStatus } from "../../incidents/api/contracts";
import { AssetStatus, AssetType } from "../../machines/api/contracts";
import { WorkOrderStatus } from "../../work-orders/api/contracts";
import { useDashboardData } from "../model/useDashboardData";
import { DashboardSectionCard } from "./components/DashboardSectionCard";
import { DashboardStatCard } from "./components/DashboardStatCard";

const machineStatusOrder = [
  AssetStatus.Available,
  AssetStatus.InUse,
  AssetStatus.InMaintenance,
  AssetStatus.Broken,
  AssetStatus.Retired,
] as const;

const machineStatusLabels: Record<AssetStatus, string> = {
  [AssetStatus.Available]: "Dostępne",
  [AssetStatus.InUse]: "W użyciu",
  [AssetStatus.InMaintenance]: "W serwisie",
  [AssetStatus.Broken]: "Uszkodzone",
  [AssetStatus.Retired]: "Wycofane",
};

const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.New]: "Nowe",
  [WorkOrderStatus.Assigned]: "Przypisane",
  [WorkOrderStatus.InProgress]: "W realizacji",
  [WorkOrderStatus.WaitingForParts]: "Oczekują na części",
  [WorkOrderStatus.Done]: "Zakończone",
  [WorkOrderStatus.Cancelled]: "Anulowane",
};

const incidentStatusLabels: Record<FailureStatus, string> = {
  [FailureStatus.Open]: "Nowe",
  [FailureStatus.Triaged]: "Wstępnie ocenione",
  [FailureStatus.InProgress]: "W trakcie",
  [FailureStatus.Resolved]: "Rozwiązane",
  [FailureStatus.Closed]: "Zamknięte",
};

export function DashboardView() {
  const { projects, halls, assets, incidents, workOrders, loading, error, reload } =
    useDashboardData();

  const metrics = useMemo(() => {
    const machines = assets.filter((asset) => asset.type === AssetType.Machine);
    const openIncidents = incidents.filter(
      (incident) =>
        incident.status !== FailureStatus.Resolved &&
        incident.status !== FailureStatus.Closed
    );
    const activeWorkOrders = workOrders.filter(
      (workOrder) =>
        workOrder.status !== WorkOrderStatus.Done &&
        workOrder.status !== WorkOrderStatus.Cancelled
    );
    const recentProjects = [...projects]
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, 5);
    const recentIncidents = [...openIncidents]
      .sort((a, b) => Date.parse(b.reportedAtUtc) - Date.parse(a.reportedAtUtc))
      .slice(0, 5);
    const recentWorkOrders = [...activeWorkOrders]
      .sort((a, b) => {
        const aDate = Date.parse(a.dueAtUtc ?? a.requestedAtUtc);
        const bDate = Date.parse(b.dueAtUtc ?? b.requestedAtUtc);
        return aDate - bDate;
      })
      .slice(0, 5);
    const machineStatuses = machineStatusOrder.map((status) => ({
      status,
      count: machines.filter((machine) => machine.status === status).length,
    }));
    const totalHallArea = halls.reduce(
      (sum, hall) => sum + (hall.areaSqMeters ?? 0),
      0
    );
    const machinesRequiringAttention = machines.filter(
      (machine) =>
        machine.status === AssetStatus.InMaintenance ||
        machine.status === AssetStatus.Broken
    ).length;
    const criticalIncidents = openIncidents.filter(
      (incident) => incident.severity === FailureSeverity.Critical
    ).length;
    const workOrdersDueSoon = activeWorkOrders.filter((workOrder) => {
      if (!workOrder.dueAtUtc) return false;
      const dueAt = Date.parse(workOrder.dueAtUtc);
      const now = Date.now();
      const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;
      return dueAt >= now && dueAt <= sevenDaysFromNow;
    }).length;
    const recentlyUpdatedProjects = projects.filter((project) => {
      const updatedAt = Date.parse(project.updatedAt);
      return updatedAt >= Date.now() - 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      machines,
      openIncidents,
      activeWorkOrders,
      recentProjects,
      recentIncidents,
      recentWorkOrders,
      machineStatuses,
      totalHallArea,
      machinesRequiringAttention,
      criticalIncidents,
      workOrdersDueSoon,
      recentlyUpdatedProjects,
    };
  }, [assets, halls, incidents, projects, workOrders]);

  const assetName = (assetId?: string | null) =>
    assets.find((asset) => asset.id === assetId)?.name ?? "Brak powiązanej maszyny";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Strona główna"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void reload()}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Odśwież
            </button>
            <Link
              to="/projects"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Projekty
            </Link>
            <Link
              to="/editor"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Edytor layoutu
            </Link>
          </div>
        }
      />

      <p className="text-sm text-slate-500">
        Podsumowanie projektów, hal, maszyn, zgłoszeń i zleceń serwisowych na
        podstawie danych z backendu.
      </p>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Projekty"
          value={String(projects.length)}
          hint={`${metrics.recentlyUpdatedProjects} zaktualizowanych w ostatnich 7 dniach`}
          tone="success"
        />
        <DashboardStatCard
          label="Hale"
          value={String(halls.length)}
          hint={`Łączna powierzchnia: ${formatArea(metrics.totalHallArea)}`}
        />
        <DashboardStatCard
          label="Maszyny"
          value={String(metrics.machines.length)}
          hint={`${metrics.machinesRequiringAttention} wymagają uwagi`}
          tone={metrics.machinesRequiringAttention > 0 ? "warning" : "success"}
        />
        <DashboardStatCard
          label="Otwarte awarie"
          value={String(metrics.openIncidents.length)}
          hint={`Krytyczne: ${metrics.criticalIncidents}, aktywne zlecenia: ${metrics.activeWorkOrders.length}`}
          tone={metrics.criticalIncidents > 0 ? "danger" : "neutral"}
        />
      </section>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Ładowanie dashboardu...
        </div>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DashboardSectionCard
                title="Ostatnio aktualizowane projekty"
                description="Pięć ostatnich projektów posortowanych po dacie aktualizacji."
                action={
                  <Link
                    to="/projects"
                    className="text-xs font-medium text-sky-700 hover:underline"
                  >
                    Zobacz wszystko
                  </Link>
                }
              >
                <div className="space-y-3">
                  {metrics.recentProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {project.name}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {project.description?.trim() || "Projekt bez opisu"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          {formatDate(project.updatedAt)}
                        </span>
                        <Link
                          to={`/editor?projectId=${encodeURIComponent(project.id)}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Otwórz layout
                        </Link>
                      </div>
                    </div>
                  ))}

                  {metrics.recentProjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
                      Brak projektów do wyświetlenia.
                    </div>
                  ) : null}
                </div>
              </DashboardSectionCard>
            </div>

            <DashboardSectionCard
              title="Serwis dziś"
              description="Najważniejsze liczby dla zgłoszeń i zleceń."
            >
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Otwarte zgłoszenia
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {metrics.openIncidents.length}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Z przestojem:{" "}
                    {
                      metrics.openIncidents.filter(
                        (incident) => incident.causesDowntime
                      ).length
                    }
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Aktywne zlecenia
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {metrics.activeWorkOrders.length}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Z terminem w 7 dni: {metrics.workOrdersDueSoon}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/incidents"
                    className="rounded-md border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Awarie
                  </Link>
                  <Link
                    to="/work-orders"
                    className="rounded-md border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Zlecenia
                  </Link>
                </div>
              </div>
            </DashboardSectionCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <DashboardSectionCard
              title="Status maszyn"
              description="Rozkład maszyn według aktualnego statusu."
            >
              <div className="space-y-3">
                {metrics.machineStatuses.map(({ status, count }) => (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-700">
                        {machineStatusLabels[status]}
                      </span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-slate-900"
                        style={{
                          width:
                            metrics.machines.length > 0
                              ? `${(count / metrics.machines.length) * 100}%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </DashboardSectionCard>

            <DashboardSectionCard
              title="Hale"
              description="Podstawowe informacje o skonfigurowanych halach."
              action={
                <Link
                  to="/halls"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Przejdź do hal
                </Link>
              }
            >
              <div className="space-y-3">
                {halls.map((hall) => (
                  <div
                    key={hall.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {hall.name}
                      </div>
                      <div className="text-xs text-slate-500">Kod: {hall.code}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>{formatArea(hall.areaSqMeters)}</div>
                      <div>Sekcje: {hall.sectionsCount}</div>
                    </div>
                  </div>
                ))}

                {halls.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
                    Brak hal do wyświetlenia.
                  </div>
                ) : null}
              </div>
            </DashboardSectionCard>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <DashboardSectionCard
              title="Najnowsze zgłoszenia"
              description="Otwarte lub aktywne zgłoszenia wymagające uwagi."
            >
              <div className="space-y-3">
                {metrics.recentIncidents.map((incident) => (
                  <Link
                    key={incident.id}
                    to={`/incidents/${incident.id}`}
                    className="block rounded-lg border border-slate-100 px-3 py-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {incident.title}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {assetName(incident.assetId)}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>{incidentStatusLabels[incident.status]}</div>
                        <div>{formatDate(incident.reportedAtUtc)}</div>
                      </div>
                    </div>
                  </Link>
                ))}

                {metrics.recentIncidents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
                    Brak otwartych zgłoszeń.
                  </div>
                ) : null}
              </div>
            </DashboardSectionCard>

            <DashboardSectionCard
              title="Najbliższe zlecenia"
              description="Aktywne zlecenia posortowane po terminie lub dacie zgłoszenia."
            >
              <div className="space-y-3">
                {metrics.recentWorkOrders.map((workOrder) => (
                  <Link
                    key={workOrder.id}
                    to={`/work-orders/${workOrder.id}`}
                    className="block rounded-lg border border-slate-100 px-3 py-3 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {workOrder.title}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {assetName(workOrder.assetId)}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>{workOrderStatusLabels[workOrder.status]}</div>
                        <div>
                          {formatDate(
                            workOrder.dueAtUtc ?? workOrder.requestedAtUtc
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}

                {metrics.recentWorkOrders.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
                    Brak aktywnych zleceń.
                  </div>
                ) : null}
              </div>
            </DashboardSectionCard>
          </section>
        </>
      )}
    </div>
  );
}

function formatDate(value?: string | null) {
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

function formatArea(value: number) {
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 0,
  }).format(value)} m²`;
}
