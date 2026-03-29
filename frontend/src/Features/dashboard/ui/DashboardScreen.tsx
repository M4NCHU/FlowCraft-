import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { FailureStatus } from "../../incidents/api/contracts";
import { ImprovementStatus } from "../../lean/api/contracts";
import { AssetStatus, AssetType } from "../../machines/api/contracts";
import {
  MaintenanceOccurrenceStatus,
  MaintenanceTriggerMode,
} from "../../maintenance/api/contracts";
import {
  WorkOrderSource,
  WorkOrderStatus,
} from "../../work-orders/api/contracts";
import { useDashboardOverviewData } from "../model/useDashboardOverviewData";
import { DashboardSectionCard } from "./components/DashboardSectionCard";
import { DashboardStatCard } from "./components/DashboardStatCard";

export function DashboardScreen() {
  const {
    projects,
    departments,
    halls,
    assets,
    incidents,
    incidentAnalytics,
    workOrders,
    improvementIdeas,
    maintenancePlans,
    employees,
    machineCategories,
    loading,
    error,
    reload,
  } = useDashboardOverviewData();

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
    const preventiveOpen = activeWorkOrders.filter(
      (workOrder) => workOrder.source === WorkOrderSource.PreventiveMaintenance
    );
    const autoCreatedPreventive = preventiveOpen.filter(
      (workOrder) => workOrder.autoCreated
    );
    const overduePlans = maintenancePlans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
    );
    const dueSoonPlans = maintenancePlans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon
    );
    const meterPlans = maintenancePlans.filter(
      (plan) => plan.triggerMode === MaintenanceTriggerMode.Meter
    );
    const activeIdeas = improvementIdeas.filter(
      (idea) =>
        idea.status !== ImprovementStatus.Implemented &&
        idea.status !== ImprovementStatus.Rejected
    );
    const implementedIdeas = improvementIdeas.filter(
      (idea) => idea.status === ImprovementStatus.Implemented
    );
    const realizedSavings = implementedIdeas.reduce(
      (sum, idea) => sum + (idea.implementedSavingsPerMonth ?? 0),
      0
    );
    const savingsPotential = activeIdeas.reduce(
      (sum, idea) => sum + (idea.estimatedSavingsPerMonth ?? 0),
      0
    );
    const employeesWithSkills = employees.filter(
      (employee) => employee.skills.length > 0
    );
    const categoriesWithMaintainers = machineCategories.filter((category) =>
      employees.some((employee) =>
        employee.skills.some(
          (skill) => skill.assetCategoryId === category.id && skill.canMaintain
        )
      )
    );
    const categoriesWithOperators = machineCategories.filter((category) =>
      employees.some((employee) =>
        employee.skills.some(
          (skill) => skill.assetCategoryId === category.id && skill.canOperate
        )
      )
    );

    return {
      machines,
      openIncidents,
      activeWorkOrders,
      preventiveOpen,
      autoCreatedPreventive,
      overduePlans,
      dueSoonPlans,
      meterPlans,
      activeIdeas,
      implementedIdeas,
      realizedSavings,
      savingsPotential,
      employeesWithSkills,
      categoriesWithMaintainers,
      categoriesWithOperators,
      plansNeedingAction: [...maintenancePlans]
        .filter(
          (plan) =>
            plan.currentStatus === MaintenanceOccurrenceStatus.Overdue ||
            plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon
        )
        .sort((a, b) => {
          const left = Date.parse(a.nextDueAtUtc ?? a.startsAtUtc);
          const right = Date.parse(b.nextDueAtUtc ?? b.startsAtUtc);
          return left - right;
        })
        .slice(0, 5),
      pareto: (incidentAnalytics?.pareto ?? []).slice(0, 5),
      skillsGaps: machineCategories
        .filter(
          (category) =>
            !employees.some((employee) =>
              employee.skills.some(
                (skill) =>
                  skill.assetCategoryId === category.id && skill.canMaintain
              )
            )
        )
        .slice(0, 5),
      priorityIdeas: activeIdeas
        .slice()
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 4),
      implementedHighlights: implementedIdeas
        .filter((idea) => idea.resultSummary || idea.actualValue != null)
        .slice()
        .sort((a, b) => Date.parse(b.updatedAtUtc) - Date.parse(a.updatedAtUtc))
        .slice(0, 3),
      recentProjects: [...projects]
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, 4),
      machineAttentionCount: machines.filter(
        (machine) =>
          machine.status === AssetStatus.Broken ||
          machine.status === AssetStatus.InMaintenance
      ).length,
    };
  }, [
    assets,
    employees,
    improvementIdeas,
    incidentAnalytics,
    incidents,
    machineCategories,
    maintenancePlans,
    projects,
    workOrders,
  ]);

  const employeeCoverage = employees.length
    ? Math.round((metrics.employeesWithSkills.length / employees.length) * 100)
    : 0;
  const maintenanceCoverage = machineCategories.length
    ? Math.round(
        (metrics.categoriesWithMaintainers.length / machineCategories.length) * 100
      )
    : 0;

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
              to="/maintenance"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Przeglądy
            </Link>
            <Link
              to="/activity"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Do zrobienia dziś
            </Link>
            <Link
              to="/incidents"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Awarie
            </Link>
            <Link
              to="/lean"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Lean i kaizen
            </Link>
          </div>
        }
      />

      <p className="text-sm text-slate-500">
        Dashboard bazuje na realnych danych z projektów, utrzymania ruchu, kompetencji
        pracowników i tablicy lean.
      </p>

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DashboardStatCard
          label="Maszyny"
          value={String(metrics.machines.length)}
          hint={`${metrics.machineAttentionCount} wymagają uwagi`}
          tone={metrics.machineAttentionCount > 0 ? "warning" : "success"}
        />
        <DashboardStatCard
          label="Przeglądy po terminie"
          value={String(metrics.overduePlans.length)}
          hint={`Wkrótce: ${metrics.dueSoonPlans.length}, licznikowe: ${metrics.meterPlans.length}`}
          tone={metrics.overduePlans.length > 0 ? "danger" : "neutral"}
        />
        <DashboardStatCard
          label="Zlecenia prewencyjne"
          value={String(metrics.preventiveOpen.length)}
          hint={`Auto-utworzone: ${metrics.autoCreatedPreventive.length}`}
          tone={metrics.autoCreatedPreventive.length > 0 ? "warning" : "neutral"}
        />
        <DashboardStatCard
          label="MTTR"
          value={
            incidentAnalytics?.mttrHours != null
              ? `${incidentAnalytics.mttrHours.toFixed(1)} h`
              : "-"
          }
          hint={`Łączny przestój: ${formatMinutes(incidentAnalytics?.totalDowntimeMinutes ?? 0)}`}
          tone="warning"
        />
        <DashboardStatCard
          label="MTBF"
          value={
            incidentAnalytics?.mtbfHours != null
              ? `${incidentAnalytics.mtbfHours.toFixed(1)} h`
              : "-"
          }
          hint={`Otwarte awarie: ${metrics.openIncidents.length}`}
          tone="success"
        />
        <DashboardStatCard
          label="Pokrycie kompetencji"
          value={`${employeeCoverage}%`}
          hint={`UR pokrywa ${maintenanceCoverage}% kategorii maszyn`}
          tone={maintenanceCoverage < 70 ? "warning" : "success"}
        />
      </section>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Ładowanie dashboardu...
        </div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
            <DashboardSectionCard
              title="Plan przeglądów i automatyzacja"
              description="Najbliższe działania prewencyjne, plany po terminie i zlecenia tworzone automatycznie."
              action={
                <Link
                  to="/maintenance"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Otwórz harmonogram
                </Link>
              }
            >
              <div className="space-y-3">
                {metrics.plansNeedingAction.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {plan.title}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {plan.assetName} ({plan.assetCode})
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {plan.triggerMode === MaintenanceTriggerMode.Meter
                          ? `Próg licznika: ${plan.nextDueMeterValue ?? "-"}`
                          : `Termin: ${formatDateTime(plan.nextDueAtUtc ?? plan.startsAtUtc)}`}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-800",
                        ].join(" ")}
                      >
                        {plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
                          ? "Po terminie"
                          : "Wkrótce"}
                      </span>
                      <Link
                        to={`/machines/${plan.assetId}`}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Maszyna
                      </Link>
                      <Link
                        to={`/maintenance?planId=${encodeURIComponent(plan.id)}`}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Szczegóły
                      </Link>
                      {plan.openWorkOrderId ? (
                        <Link
                          to={`/work-orders/${plan.openWorkOrderId}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Zlecenie
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
                {metrics.plansNeedingAction.length === 0 ? (
                  <EmptyState text="Brak planów wymagających reakcji w tym momencie." />
                ) : null}
              </div>
            </DashboardSectionCard>

            <DashboardSectionCard
              title="Pareto przyczyn przestojów"
              description="Największe źródła strat na podstawie zgłoszeń awarii i czasu przestoju."
              action={
                <Link
                  to="/incidents"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Otwórz awarie
                </Link>
              }
            >
              <div className="space-y-3">
                {metrics.pareto.map((item) => (
                  <div key={`${item.causeName}-${item.failureCauseCategoryId ?? "none"}`}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900">{item.causeName}</span>
                      <span className="text-slate-500">
                        {formatMinutes(item.totalDowntimeMinutes)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-slate-900"
                        style={{ width: `${Math.max(item.share, 8)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Udział: {item.share.toFixed(1)}%, kumulacja: {item.cumulativeShare.toFixed(1)}%
                    </div>
                  </div>
                ))}
                {metrics.pareto.length === 0 ? (
                  <EmptyState text="Pareto pojawi się po zapisaniu awarii z kategoriami przyczyn i przestojami." />
                ) : null}
              </div>
            </DashboardSectionCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_1fr_1fr]">
            <DashboardSectionCard
              title="Kompetencje i macierz umiejętności"
              description="Pokrycie kategorii maszyn przez operatorów i utrzymanie ruchu."
              action={
                <Link
                  to="/employees"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Otwórz pracowników
                </Link>
              }
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <InfoTile label="Pracownicy" value={`${metrics.employeesWithSkills.length}/${employees.length}`} hint="z przypisaną kompetencją" />
                <InfoTile label="Operatorzy" value={`${metrics.categoriesWithOperators.length}/${machineCategories.length}`} hint="kategorii z obsługą" />
                <InfoTile label="UR" value={`${metrics.categoriesWithMaintainers.length}/${machineCategories.length}`} hint="kategorii z utrzymaniem" />
              </div>
              <div className="mt-4 space-y-3">
                {metrics.skillsGaps.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{category.name}</div>
                      <div className="text-xs text-slate-500">{category.parameters.length} parametrów kategorii</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        Brak kompetencji UR
                      </span>
                      <Link
                        to="/machine-categories"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Kategorie
                      </Link>
                    </div>
                  </div>
                ))}
                {metrics.skillsGaps.length === 0 ? (
                  <EmptyState text="Każda aktywna kategoria maszyn ma już pokrycie kompetencyjne dla UR." />
                ) : null}
              </div>
            </DashboardSectionCard>

            <DashboardSectionCard
              title="Lean z mierzalnym efektem"
              description="Priorytetowe kaizeny i ostatnie wdrożenia z wynikiem before/after."
              action={
                <Link
                  to="/lean"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Otwórz tablicę lean
                </Link>
              }
            >
              <div className="space-y-3">
                {metrics.priorityIdeas.map((idea) => (
                  <div key={idea.id} className="rounded-lg border border-slate-100 px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-slate-900">{idea.title}</div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {idea.priorityScore} pkt
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {idea.departmentName ?? "Bez działu"}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {idea.baselineMetricName
                        ? `${idea.baselineMetricName}: ${idea.baselineValue ?? "-"} → ${idea.targetValue ?? "-"}`
                        : "Brak zdefiniowanego KPI"}
                    </div>
                  </div>
                ))}
                {metrics.priorityIdeas.length === 0 ? (
                  <EmptyState text="Brak aktywnych usprawnień do priorytetyzacji." />
                ) : null}
              </div>
            </DashboardSectionCard>

            <DashboardSectionCard
              title="Efekty wdrożeń"
              description="Najświeższe usprawnienia z opisanym rezultatem i oszczędnościami."
            >
              <div className="space-y-3">
                {metrics.implementedHighlights.map((idea) => (
                  <div key={idea.id} className="rounded-lg border border-slate-100 px-3 py-3">
                    <div className="text-sm font-medium text-slate-900">{idea.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {idea.improvementPercent != null
                        ? `Poprawa KPI: ${idea.improvementPercent}%`
                        : "Brak pełnego pomiaru poprawy"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {idea.implementedSavingsPerMonth != null
                        ? `Oszczędności: ${formatCurrency(idea.implementedSavingsPerMonth)}/mies.`
                        : "Bez policzonych oszczędności"}
                    </div>
                  </div>
                ))}
                {metrics.implementedHighlights.length === 0 ? (
                  <EmptyState text="Uzupełnij wyniki wdrożeń w lean, aby pokazać efekty na dashboardzie." />
                ) : null}
              </div>
            </DashboardSectionCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
            <DashboardSectionCard
              title="Serwis i zgłoszenia"
              description="Najważniejsze liczby dla awarii, zleceń i hali produkcyjnej."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoTile label="Otwarte awarie" value={String(metrics.openIncidents.length)} hint={`Wszystkich zgłoszeń: ${incidents.length}`} />
                <InfoTile label="Aktywne zlecenia" value={String(metrics.activeWorkOrders.length)} hint={`Prewencyjne: ${metrics.preventiveOpen.length}`} />
                <InfoTile label="Działy" value={String(departments.length)} hint={`Pracownicy: ${employees.length}`} />
                <InfoTile label="Hale" value={String(halls.length)} hint={`Projekty: ${projects.length}`} />
              </div>
            </DashboardSectionCard>

            <DashboardSectionCard
              title="Auto-utworzone zlecenia"
              description="Zlecenia serwisowe wygenerowane z harmonogramu przeglądów."
              action={
                <Link
                  to="/work-orders"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Otwórz zlecenia
                </Link>
              }
            >
              <div className="space-y-3">
                {metrics.autoCreatedPreventive.slice(0, 4).map((workOrder) => (
                  <div
                    key={workOrder.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{workOrder.title}</div>
                      <div className="text-xs text-slate-500">{workOrder.number}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workOrder.assetId ? (
                        <Link
                          to={`/machines/${workOrder.assetId}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Maszyna
                        </Link>
                      ) : null}
                      <Link
                        to={`/work-orders/${workOrder.id}`}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Szczegóły
                      </Link>
                    </div>
                  </div>
                ))}
                {metrics.autoCreatedPreventive.length === 0 ? (
                  <EmptyState text="Brak otwartych zleceń utworzonych automatycznie z planów przeglądów." />
                ) : null}
              </div>
            </DashboardSectionCard>

            <DashboardSectionCard
              title="Ostatnio aktywne projekty"
              description="Najszybciej zmieniające się projekty i przejścia do layoutów."
              action={
                <Link
                  to="/projects"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Otwórz projekty
                </Link>
              }
            >
              <div className="space-y-3">
                {metrics.recentProjects.map((project) => (
                  <div key={project.id} className="rounded-lg border border-slate-100 px-3 py-3">
                    <div className="text-sm font-medium text-slate-900">{project.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {project.description?.trim() || "Projekt bez opisu"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to="/projects"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Lista
                      </Link>
                      <Link
                        to={`/editor?projectId=${encodeURIComponent(project.id)}`}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Layout
                      </Link>
                    </div>
                  </div>
                ))}
                {metrics.recentProjects.length === 0 ? (
                  <EmptyState text="Brak projektów do wyświetlenia." />
                ) : null}
              </div>
            </DashboardSectionCard>
          </section>
        </>
      )}
    </div>
  );
}

function InfoTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Brak terminu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Brak terminu";
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(value: number) {
  if (value <= 0) return "0 min";
  if (value >= 60) {
    return `${(value / 60).toFixed(1)} h`;
  }
  return `${value} min`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}
