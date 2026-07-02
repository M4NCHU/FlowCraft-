import { type ReactNode, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  formatAreaSqMeters,
  formatHallFootprint,
  getHallGeometrySummary,
} from "../../halls/lib/hallGeometry";
import { FailureStatus } from "../../incidents/api/contracts";
import { useInventoryWorkspace } from "../../inventory/model/useInventoryWorkspace";
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

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";
type DashboardPanelMode =
  | "operations"
  | "maintenance"
  | "incidents"
  | "skills"
  | "inventory"
  | "lean"
  | "layout";

type PriorityItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badge: string;
  tone: Tone;
  priority: number;
  actionTo: string;
  actionLabel: string;
  secondaryTo?: string;
  secondaryLabel?: string;
};

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

export function DashboardScreen() {
  const [panelMode, setPanelMode] = useState<DashboardPanelMode>("operations");

  const {
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

  const inventory = useInventoryWorkspace({
    departments,
    assets,
    machineCategories,
    workOrders,
    maintenancePlans,
    seedReady: !loading,
  });

  const metrics = useMemo(() => {
    const machines = assets.filter((asset) => asset.type === AssetType.Machine);

    const openIncidents = incidents.filter(
      (incident) =>
        incident.status !== FailureStatus.Resolved &&
        incident.status !== FailureStatus.Closed,
    );

    const activeWorkOrders = workOrders.filter(
      (workOrder) =>
        workOrder.status !== WorkOrderStatus.Done &&
        workOrder.status !== WorkOrderStatus.Cancelled,
    );

    const preventiveOpen = activeWorkOrders.filter(
      (workOrder) => workOrder.source === WorkOrderSource.PreventiveMaintenance,
    );

    const autoCreatedPreventive = preventiveOpen.filter(
      (workOrder) => workOrder.autoCreated,
    );

    const overduePlans = maintenancePlans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.Overdue,
    );

    const dueSoonPlans = maintenancePlans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon,
    );

    const meterPlans = maintenancePlans.filter(
      (plan) => plan.triggerMode === MaintenanceTriggerMode.Meter,
    );

    const activeIdeas = improvementIdeas.filter(
      (idea) =>
        idea.status !== ImprovementStatus.Implemented &&
        idea.status !== ImprovementStatus.Rejected,
    );

    const implementedIdeas = improvementIdeas.filter(
      (idea) => idea.status === ImprovementStatus.Implemented,
    );

    const realizedSavings = implementedIdeas.reduce(
      (sum, idea) => sum + (idea.implementedSavingsPerMonth ?? 0),
      0,
    );

    const savingsPotential = activeIdeas.reduce(
      (sum, idea) => sum + (idea.estimatedSavingsPerMonth ?? 0),
      0,
    );

    const employeesWithSkills = employees.filter(
      (employee) => employee.skills.length > 0,
    );

    const categoriesWithMaintainers = machineCategories.filter((category) =>
      employees.some((employee) =>
        employee.skills.some(
          (skill) => skill.assetCategoryId === category.id && skill.canMaintain,
        ),
      ),
    );

    const categoriesWithOperators = machineCategories.filter((category) =>
      employees.some((employee) =>
        employee.skills.some(
          (skill) => skill.assetCategoryId === category.id && skill.canOperate,
        ),
      ),
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
            plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon,
        )
        .sort((a, b) => {
          const left = Date.parse(a.nextDueAtUtc ?? a.startsAtUtc);
          const right = Date.parse(b.nextDueAtUtc ?? b.startsAtUtc);
          return left - right;
        })
        .slice(0, 8),
      pareto: (incidentAnalytics?.pareto ?? []).slice(0, 6),
      skillsGaps: machineCategories
        .filter(
          (category) =>
            !employees.some((employee) =>
              employee.skills.some(
                (skill) =>
                  skill.assetCategoryId === category.id && skill.canMaintain,
              ),
            ),
        )
        .slice(0, 8),
      priorityIdeas: activeIdeas
        .slice()
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, 8),
      implementedHighlights: implementedIdeas
        .filter((idea) => idea.resultSummary || idea.actualValue != null)
        .slice()
        .sort((a, b) => Date.parse(b.updatedAtUtc) - Date.parse(a.updatedAtUtc))
        .slice(0, 6),
      totalSections: halls.reduce(
        (sum, hall) => sum + (hall.sectionsCount ?? 0),
        0,
      ),
      topHalls: [...halls]
        .sort((left, right) => {
          if (right.sectionsCount !== left.sectionsCount) {
            return right.sectionsCount - left.sectionsCount;
          }

          return (right.areaSqMeters ?? 0) - (left.areaSqMeters ?? 0);
        })
        .slice(0, 6),
      machineAttentionCount: machines.filter(
        (machine) =>
          machine.status === AssetStatus.Broken ||
          machine.status === AssetStatus.InMaintenance,
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
    halls,
    workOrders,
  ]);

  const employeeCoverage = employees.length
    ? Math.round((metrics.employeesWithSkills.length / employees.length) * 100)
    : 0;

  const maintenanceCoverage = machineCategories.length
    ? Math.round(
        (metrics.categoriesWithMaintainers.length / machineCategories.length) *
          100,
      )
    : 0;

  const priorityItems = useMemo<PriorityItem[]>(() => {
    const plans: PriorityItem[] = metrics.plansNeedingAction.map((plan) => ({
      id: `plan-${plan.id}`,
      title: plan.title,
      subtitle: `${plan.assetName} (${plan.assetCode})`,
      meta:
        plan.triggerMode === MaintenanceTriggerMode.Meter
          ? `Próg licznika: ${plan.nextDueMeterValue ?? "-"}`
          : `Termin: ${formatDateTime(plan.nextDueAtUtc ?? plan.startsAtUtc)}`,
      badge:
        plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
          ? "Przegląd po terminie"
          : "Przegląd wkrótce",
      tone:
        plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
          ? "rose"
          : "amber",
      priority:
        plan.currentStatus === MaintenanceOccurrenceStatus.Overdue ? 100 : 80,
      actionTo: `/maintenance?planId=${encodeURIComponent(plan.id)}`,
      actionLabel: "Plan",
      secondaryTo: `/machines/${plan.assetId}`,
      secondaryLabel: "Maszyna",
    }));

    const incidentsToHandle: PriorityItem[] = metrics.openIncidents
      .slice()
      .sort((a, b) => Date.parse(b.reportedAtUtc) - Date.parse(a.reportedAtUtc))
      .slice(0, 6)
      .map((incident) => ({
        id: `incident-${incident.id}`,
        title: incident.title,
        subtitle: incident.failureCauseCategoryName ?? "Bez przyczyny",
        meta: `Zgłoszono: ${formatDateTime(incident.reportedAtUtc)}`,
        badge: incident.causesDowntime ? "Przestój" : "Awaria",
        tone: incident.causesDowntime ? "rose" : "amber",
        priority: incident.causesDowntime ? 95 : 70,
        actionTo: `/incidents/${incident.id}`,
        actionLabel: "Awaria",
        secondaryTo: incident.assetId
          ? `/machines/${incident.assetId}`
          : undefined,
        secondaryLabel: incident.assetId ? "Maszyna" : undefined,
      }));

    const lowStock: PriorityItem[] = inventory.suggestions
      .slice(0, 6)
      .map((suggestion) => {
        const item = inventory.items.find(
          (entry) => entry.id === suggestion.itemId,
        );

        return {
          id: `stock-${suggestion.itemId}`,
          title: item?.name ?? "Pozycja magazynowa",
          subtitle: suggestion.reason,
          meta: item
            ? `Sugerowany zakup: ${suggestion.suggestedQuantity} ${item.unit}`
            : "Sugerowany zakup",
          badge: "Niski stock",
          tone: suggestion.urgency === "high" ? "rose" : "amber",
          priority: suggestion.urgency === "high" ? 90 : 60,
          actionTo: "/inventory?low=1",
          actionLabel: "Magazyn",
          secondaryTo: item?.linkedAssetId
            ? `/machines/${item.linkedAssetId}`
            : undefined,
          secondaryLabel: item?.linkedAssetId ? "Maszyna" : undefined,
        };
      });

    const autoOrders: PriorityItem[] = metrics.autoCreatedPreventive
      .slice(0, 5)
      .map((workOrder) => ({
        id: `wo-${workOrder.id}`,
        title: workOrder.title,
        subtitle: workOrder.number,
        meta: "Zlecenie automatyczne z planu przeglądu",
        badge: "Auto-zlecenie",
        tone: "cyan",
        priority: 55,
        actionTo: `/work-orders/${workOrder.id}`,
        actionLabel: "Zlecenie",
        secondaryTo: workOrder.assetId
          ? `/machines/${workOrder.assetId}`
          : undefined,
        secondaryLabel: workOrder.assetId ? "Maszyna" : undefined,
      }));

    return [...plans, ...incidentsToHandle, ...lowStock, ...autoOrders]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 12);
  }, [
    inventory.items,
    inventory.suggestions,
    metrics.autoCreatedPreventive,
    metrics.openIncidents,
    metrics.plansNeedingAction,
  ]);

  return (
    <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  Przegląd operacyjny
                </span>

                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  {metrics.machines.length} maszyn
                </span>

                {metrics.overduePlans.length > 0 ? (
                  <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                    {metrics.overduePlans.length} przeglądów po terminie
                  </span>
                ) : null}
              </div>

              <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                Strona główna
              </h1>

              <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                Jedno miejsce do kontroli kondycji hal, maszyn, przeglądów,
                awarii, kompetencji i magazynu. Na środku są tematy, które
                wymagają reakcji.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:max-w-[48rem] xl:justify-end">
              <button
                type="button"
                onClick={() => void reload()}
                className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
              >
                Odśwież
              </button>

              <Link
                to="/activity"
                className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
              >
                Do zrobienia dziś
              </Link>

              <Link
                to="/maintenance"
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Przeglądy
              </Link>

              <Link
                to="/incidents"
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Awarie
              </Link>

              <Link
                to="/inventory"
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Magazyn
              </Link>

              <Link
                to="/lean"
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Lean
              </Link>

              <Link
                to="/reports"
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Raporty
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
            <SummaryCard
              label="Maszyny"
              value={String(metrics.machines.length)}
              hint={`${metrics.machineAttentionCount} wymagają uwagi`}
              tone={metrics.machineAttentionCount > 0 ? "amber" : "emerald"}
            />

            <SummaryCard
              label="Przeglądy po terminie"
              value={String(metrics.overduePlans.length)}
              hint={`Wkrótce: ${metrics.dueSoonPlans.length}`}
              tone={metrics.overduePlans.length > 0 ? "rose" : "slate"}
            />

            <SummaryCard
              label="Prewencja"
              value={String(metrics.preventiveOpen.length)}
              hint={`Auto: ${metrics.autoCreatedPreventive.length}`}
              tone={
                metrics.autoCreatedPreventive.length > 0 ? "amber" : "slate"
              }
            />

            <SummaryCard
              label="Otwarte awarie"
              value={String(metrics.openIncidents.length)}
              hint={`MTTR: ${
                incidentAnalytics?.mttrHours != null
                  ? `${incidentAnalytics.mttrHours.toFixed(1)} h`
                  : "-"
              }`}
              tone={metrics.openIncidents.length > 0 ? "rose" : "emerald"}
            />

            <SummaryCard
              label="Kompetencje"
              value={`${employeeCoverage}%`}
              hint={`UR: ${maintenanceCoverage}% kategorii`}
              tone={maintenanceCoverage < 70 ? "amber" : "emerald"}
            />

            <SummaryCard
              label="Niski stock"
              value={String(inventory.metrics.lowStockCount)}
              hint={`Zakupy: ${inventory.metrics.openProcurementsCount}`}
              tone={inventory.metrics.lowStockCount > 0 ? "amber" : "emerald"}
            />
          </div>
        </section>

        {error ? <AlertBox tone="amber">{error.message}</AlertBox> : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
            Ładowanie dashboardu...
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Priorytety operacyjne
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Najważniejsze tematy z przeglądów, awarii, magazynu i
                    zleceń.
                  </p>
                </div>

                <Link
                  to="/activity"
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Pełna kolejka
                </Link>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {priorityItems.map((item, index) => (
                  <PriorityItemCard key={item.id} item={item} index={index} />
                ))}

                {priorityItems.length === 0 ? (
                  <EmptyState text="Brak tematów wymagających natychmiastowej reakcji." />
                ) : null}
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                <PanelTab
                  active={panelMode === "operations"}
                  onClick={() => setPanelMode("operations")}
                >
                  Operacje
                </PanelTab>

                <PanelTab
                  active={panelMode === "maintenance"}
                  onClick={() => setPanelMode("maintenance")}
                >
                  UR
                </PanelTab>

                <PanelTab
                  active={panelMode === "inventory"}
                  onClick={() => setPanelMode("inventory")}
                >
                  Magazyn
                </PanelTab>

                <PanelTab
                  active={panelMode === "lean"}
                  onClick={() => setPanelMode("lean")}
                >
                  Lean
                </PanelTab>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                <PanelTab
                  active={panelMode === "incidents"}
                  onClick={() => setPanelMode("incidents")}
                >
                  Pareto
                </PanelTab>

                <PanelTab
                  active={panelMode === "skills"}
                  onClick={() => setPanelMode("skills")}
                >
                  Kompetencje
                </PanelTab>

                <PanelTab
                  active={panelMode === "layout"}
                  onClick={() => setPanelMode("layout")}
                >
                  Hale
                </PanelTab>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {panelMode === "operations" ? (
                <OperationsPanel
                  openIncidents={metrics.openIncidents.length}
                  allIncidents={incidents.length}
                  activeWorkOrders={metrics.activeWorkOrders.length}
                  preventiveOpen={metrics.preventiveOpen.length}
                  departments={departments.length}
                  employees={employees.length}
                  halls={halls.length}
                  sections={metrics.totalSections}
                />
              ) : null}

              {panelMode === "maintenance" ? (
                <MaintenancePanel
                  plans={metrics.plansNeedingAction}
                  meterPlansCount={metrics.meterPlans.length}
                  dueSoonCount={metrics.dueSoonPlans.length}
                  overdueCount={metrics.overduePlans.length}
                />
              ) : null}

              {panelMode === "incidents" ? (
                <ParetoPanel
                  pareto={metrics.pareto}
                  mttrHours={incidentAnalytics?.mttrHours}
                  mtbfHours={incidentAnalytics?.mtbfHours}
                  downtimeMinutes={incidentAnalytics?.totalDowntimeMinutes ?? 0}
                />
              ) : null}

              {panelMode === "skills" ? (
                <SkillsPanel
                  employeesWithSkills={metrics.employeesWithSkills.length}
                  employeesCount={employees.length}
                  categoriesWithOperators={
                    metrics.categoriesWithOperators.length
                  }
                  categoriesWithMaintainers={
                    metrics.categoriesWithMaintainers.length
                  }
                  categoriesCount={machineCategories.length}
                  skillsGaps={metrics.skillsGaps}
                />
              ) : null}

              {panelMode === "inventory" ? (
                <InventoryPanel inventory={inventory} />
              ) : null}

              {panelMode === "lean" ? (
                <LeanPanel
                  priorityIdeas={metrics.priorityIdeas}
                  implementedHighlights={metrics.implementedHighlights}
                  savingsPotential={metrics.savingsPotential}
                  realizedSavings={metrics.realizedSavings}
                />
              ) : null}

              {panelMode === "layout" ? (
                <LayoutPanel
                  halls={metrics.topHalls}
                  totalSections={metrics.totalSections}
                />
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PriorityItemCard({
  item,
  index,
}: {
  item: PriorityItem;
  index: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-400">
            {index + 1}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="line-clamp-1 text-sm font-semibold text-white">
                {item.title}
              </div>

              <Badge tone={item.tone}>{item.badge}</Badge>
            </div>

            <div className="mt-1 line-clamp-1 text-xs text-slate-500">
              {item.subtitle}
            </div>

            <div className="mt-2 text-xs text-slate-400">{item.meta}</div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Link
            to={item.actionTo}
            className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
          >
            {item.actionLabel}
          </Link>

          {item.secondaryTo && item.secondaryLabel ? (
            <Link
              to={item.secondaryTo}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              {item.secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OperationsPanel({
  openIncidents,
  allIncidents,
  activeWorkOrders,
  preventiveOpen,
  departments,
  employees,
  halls,
  sections,
}: {
  openIncidents: number;
  allIncidents: number;
  activeWorkOrders: number;
  preventiveOpen: number;
  departments: number;
  employees: number;
  halls: number;
  sections: number;
}) {
  return (
    <PanelShell
      title="Serwis i zgłoszenia"
      description="Najważniejsze liczby dla awarii, zleceń i hali produkcyjnej."
      action={
        <Link to="/activity" className={smallActionClassName}>
          Do zrobienia
        </Link>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoTile
          label="Otwarte awarie"
          value={String(openIncidents)}
          hint={`Wszystkich zgłoszeń: ${allIncidents}`}
          tone={openIncidents > 0 ? "rose" : "emerald"}
        />

        <InfoTile
          label="Aktywne zlecenia"
          value={String(activeWorkOrders)}
          hint={`Prewencyjne: ${preventiveOpen}`}
          tone={activeWorkOrders > 0 ? "cyan" : "slate"}
        />

        <InfoTile
          label="Działy"
          value={String(departments)}
          hint={`Pracownicy: ${employees}`}
        />

        <InfoTile
          label="Hale"
          value={String(halls)}
          hint={`Sekcje łącznie: ${sections}`}
        />
      </div>
    </PanelShell>
  );
}

function MaintenancePanel({
  plans,
  meterPlansCount,
  dueSoonCount,
  overdueCount,
}: {
  plans: any[];
  meterPlansCount: number;
  dueSoonCount: number;
  overdueCount: number;
}) {
  return (
    <PanelShell
      title="Plan przeglądów"
      description="Najbliższe działania prewencyjne i plany po terminie."
      action={
        <Link to="/maintenance" className={smallActionClassName}>
          Harmonogram
        </Link>
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <InfoTile
          label="Po terminie"
          value={String(overdueCount)}
          hint="Wymaga reakcji"
          tone={overdueCount > 0 ? "rose" : "slate"}
        />

        <InfoTile
          label="Wkrótce"
          value={String(dueSoonCount)}
          hint="Próg alarmowy"
          tone={dueSoonCount > 0 ? "amber" : "slate"}
        />

        <InfoTile
          label="Licznikowe"
          value={String(meterPlansCount)}
          hint="Po zużyciu"
          tone="cyan"
        />
      </div>

      <div className="mt-3 space-y-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="line-clamp-1 text-sm font-semibold text-white">
                  {plan.title}
                </div>

                <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {plan.assetName} ({plan.assetCode})
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  {plan.triggerMode === MaintenanceTriggerMode.Meter
                    ? `Próg licznika: ${plan.nextDueMeterValue ?? "-"}`
                    : `Termin: ${formatDateTime(plan.nextDueAtUtc ?? plan.startsAtUtc)}`}
                </div>
              </div>

              <Badge
                tone={
                  plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
                    ? "rose"
                    : "amber"
                }
              >
                {plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
                  ? "Po terminie"
                  : "Wkrótce"}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={`/machines/${plan.assetId}`}
                className={compactButtonClassName}
              >
                Maszyna
              </Link>

              <Link
                to={`/maintenance?planId=${encodeURIComponent(plan.id)}`}
                className={primaryCompactButtonClassName}
              >
                Szczegóły
              </Link>

              {plan.openWorkOrderId ? (
                <Link
                  to={`/work-orders/${plan.openWorkOrderId}`}
                  className={compactButtonClassName}
                >
                  Zlecenie
                </Link>
              ) : null}
            </div>
          </div>
        ))}

        {plans.length === 0 ? (
          <EmptyState text="Brak planów wymagających reakcji w tym momencie." />
        ) : null}
      </div>
    </PanelShell>
  );
}

function ParetoPanel({
  pareto,
  mttrHours,
  mtbfHours,
  downtimeMinutes,
}: {
  pareto: any[];
  mttrHours?: number | null;
  mtbfHours?: number | null;
  downtimeMinutes: number;
}) {
  return (
    <PanelShell
      title="Pareto przyczyn przestojów"
      description="Największe źródła strat według zgłoszeń awarii."
      action={
        <Link to="/incidents" className={smallActionClassName}>
          Awarie
        </Link>
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <InfoTile
          label="MTTR"
          value={mttrHours != null ? `${mttrHours.toFixed(1)} h` : "-"}
          hint="Średni czas naprawy"
          tone="amber"
        />

        <InfoTile
          label="MTBF"
          value={mtbfHours != null ? `${mtbfHours.toFixed(1)} h` : "-"}
          hint="Średni czas między awariami"
          tone="emerald"
        />

        <InfoTile
          label="Przestój"
          value={formatMinutes(downtimeMinutes)}
          hint="Łącznie"
          tone={downtimeMinutes > 0 ? "rose" : "slate"}
        />
      </div>

      <div className="mt-3 space-y-3">
        {pareto.map((item) => (
          <div
            key={`${item.causeName}-${item.failureCauseCategoryId ?? "none"}`}
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="line-clamp-1 font-semibold text-white">
                {item.causeName}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {formatMinutes(item.totalDowntimeMinutes)}
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-cyan-400/70"
                style={{ width: `${Math.max(item.share, 8)}%` }}
              />
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Udział: {item.share.toFixed(1)}%, kumulacja:{" "}
              {item.cumulativeShare.toFixed(1)}%
            </div>
          </div>
        ))}

        {pareto.length === 0 ? (
          <EmptyState text="Pareto pojawi się po zapisaniu awarii z kategoriami przyczyn i przestojami." />
        ) : null}
      </div>
    </PanelShell>
  );
}

function SkillsPanel({
  employeesWithSkills,
  employeesCount,
  categoriesWithOperators,
  categoriesWithMaintainers,
  categoriesCount,
  skillsGaps,
}: {
  employeesWithSkills: number;
  employeesCount: number;
  categoriesWithOperators: number;
  categoriesWithMaintainers: number;
  categoriesCount: number;
  skillsGaps: any[];
}) {
  return (
    <PanelShell
      title="Kompetencje i macierz"
      description="Pokrycie kategorii maszyn przez operatorów i UR."
      action={
        <Link to="/employees" className={smallActionClassName}>
          Pracownicy
        </Link>
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <InfoTile
          label="Pracownicy"
          value={`${employeesWithSkills}/${employeesCount}`}
          hint="z kompetencją"
          tone="cyan"
        />

        <InfoTile
          label="Operatorzy"
          value={`${categoriesWithOperators}/${categoriesCount}`}
          hint="kategorii z obsługą"
          tone="emerald"
        />

        <InfoTile
          label="UR"
          value={`${categoriesWithMaintainers}/${categoriesCount}`}
          hint="kategorii z UR"
          tone={
            categoriesWithMaintainers < categoriesCount ? "amber" : "emerald"
          }
        />
      </div>

      <div className="mt-3 space-y-2">
        {skillsGaps.map((category) => (
          <div
            key={category.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  {category.name}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  {category.parameters.length} parametrów kategorii
                </div>
              </div>

              <Badge tone="amber">Brak kompetencji UR</Badge>
            </div>

            <div className="mt-3">
              <Link to="/machine-categories" className={compactButtonClassName}>
                Kategorie
              </Link>
            </div>
          </div>
        ))}

        {skillsGaps.length === 0 ? (
          <EmptyState text="Każda aktywna kategoria maszyn ma już pokrycie kompetencyjne dla UR." />
        ) : null}
      </div>
    </PanelShell>
  );
}

function InventoryPanel({
  inventory,
}: {
  inventory: ReturnType<typeof useInventoryWorkspace>;
}) {
  return (
    <PanelShell
      title="Magazyn i gotowość serwisowa"
      description="Pozycje, które warto uzupełnić, zanim zablokują zlecenia lub przeglądy."
      action={
        <Link to="/inventory?low=1" className={smallActionClassName}>
          Magazyn
        </Link>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoTile
          label="Niski stock"
          value={String(inventory.metrics.lowStockCount)}
          hint="pozycji poniżej minimum"
          tone={inventory.metrics.lowStockCount > 0 ? "amber" : "emerald"}
        />

        <InfoTile
          label="Zakupy"
          value={String(inventory.metrics.openProcurementsCount)}
          hint="zamówień i dostaw w toku"
          tone="cyan"
        />
      </div>

      <div className="mt-3 space-y-2">
        {inventory.suggestions.slice(0, 8).map((suggestion) => {
          const item = inventory.items.find(
            (entry) => entry.id === suggestion.itemId,
          );

          if (!item) {
            return null;
          }

          return (
            <div
              key={suggestion.itemId}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-semibold text-white">
                    {item.name}
                  </div>

                  <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {suggestion.reason}
                  </div>
                </div>

                <Badge tone={suggestion.urgency === "high" ? "rose" : "amber"}>
                  {suggestion.suggestedQuantity} {item.unit}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/inventory?low=1"
                  className={primaryCompactButtonClassName}
                >
                  Magazyn
                </Link>

                {item.linkedAssetId ? (
                  <Link
                    to={`/machines/${item.linkedAssetId}`}
                    className={compactButtonClassName}
                  >
                    Maszyna
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}

        {inventory.suggestions.length === 0 ? (
          <EmptyState text="Brak pozycji wymagających pilnej reakcji magazynu." />
        ) : null}
      </div>
    </PanelShell>
  );
}

function LeanPanel({
  priorityIdeas,
  implementedHighlights,
  savingsPotential,
  realizedSavings,
}: {
  priorityIdeas: any[];
  implementedHighlights: any[];
  savingsPotential: number;
  realizedSavings: number;
}) {
  return (
    <PanelShell
      title="Lean i efekty wdrożeń"
      description="Priorytetowe kaizeny oraz ostatnie wdrożenia z wynikiem."
      action={
        <Link to="/lean" className={smallActionClassName}>
          Lean
        </Link>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoTile
          label="Potencjał"
          value={formatCurrency(savingsPotential)}
          hint="aktywnych usprawnień"
          tone="cyan"
        />

        <InfoTile
          label="Efekt"
          value={formatCurrency(realizedSavings)}
          hint="wdrożenia / mies."
          tone="emerald"
        />
      </div>

      <div className="mt-3 space-y-2">
        {priorityIdeas.map((idea) => (
          <div
            key={idea.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="line-clamp-1 text-sm font-semibold text-white">
                {idea.title}
              </div>

              <Badge tone={idea.priorityScore >= 65 ? "amber" : "slate"}>
                {idea.priorityScore} pkt
              </Badge>
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {idea.departmentName ?? "Bez działu"}
            </div>

            <div className="mt-2 text-xs text-slate-400">
              {idea.baselineMetricName
                ? `${idea.baselineMetricName}: ${idea.baselineValue ?? "-"} → ${
                    idea.targetValue ?? "-"
                  }`
                : "Brak zdefiniowanego KPI"}
            </div>
          </div>
        ))}

        {priorityIdeas.length === 0 ? (
          <EmptyState text="Brak aktywnych usprawnień do priorytetyzacji." />
        ) : null}
      </div>

      <div className="mt-4 border-t border-slate-800 pt-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Ostatnie efekty
        </div>

        <div className="space-y-2">
          {implementedHighlights.map((idea) => (
            <div
              key={idea.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
            >
              <div className="line-clamp-1 text-sm font-semibold text-white">
                {idea.title}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {idea.improvementPercent != null
                  ? `Poprawa KPI: ${idea.improvementPercent}%`
                  : "Brak pełnego pomiaru poprawy"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                {idea.implementedSavingsPerMonth != null
                  ? `Oszczędności: ${formatCurrency(
                      idea.implementedSavingsPerMonth,
                    )}/mies.`
                  : "Bez policzonych oszczędności"}
              </div>
            </div>
          ))}

          {implementedHighlights.length === 0 ? (
            <EmptyState text="Uzupełnij wyniki wdrożeń w Lean, aby pokazać efekty na dashboardzie." />
          ) : null}
        </div>
      </div>
    </PanelShell>
  );
}

function LayoutPanel({
  halls,
  totalSections,
}: {
  halls: any[];
  totalSections: number;
}) {
  return (
    <PanelShell
      title="Hale i layouty"
      description="Największe hale i szybkie przejście do widoku layoutu."
      action={
        <Link to="/halls" className={smallActionClassName}>
          Hale
        </Link>
      }
    >
      <InfoTile
        label="Sekcje łącznie"
        value={String(totalSections)}
        hint="we wszystkich halach"
        tone="cyan"
      />

      <div className="mt-3 space-y-2">
        {halls.map((hall) => (
          <div
            key={hall.id}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
          >
            <div className="text-sm font-semibold text-white">
              {hall.name}
              {hall.code ? ` (${hall.code})` : ""}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {hall.sectionsCount} sekcji · {formatHallCompactMeta(hall)}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/halls" className={compactButtonClassName}>
                Lista hal
              </Link>

              <Link
                to={`/editor?hallId=${encodeURIComponent(hall.id)}`}
                className={primaryCompactButtonClassName}
              >
                Layout
              </Link>
            </div>
          </div>
        ))}

        {halls.length === 0 ? (
          <EmptyState text="Brak hal do wyświetlenia." />
        ) : null}
      </div>
    </PanelShell>
  );
}

function PanelShell({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        {action}
      </div>

      {children}
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

function InfoTile({
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
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>

      <div className="mt-1 truncate text-lg font-bold leading-none">
        {value}
      </div>

      <div className="mt-1 truncate text-xs opacity-70">{hint}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
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

function PanelTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-2 py-2 text-xs font-bold uppercase tracking-[0.1em] transition",
        active
          ? "border-cyan-400/35 bg-cyan-400/[0.10] text-cyan-100"
          : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function AlertBox({
  tone,
  children,
}: {
  tone: "amber" | "rose";
  children: ReactNode;
}) {
  const className =
    tone === "rose"
      ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-100"
      : "border-amber-400/25 bg-amber-400/[0.08] text-amber-100";

  return (
    <div
      className={`shrink-0 rounded-2xl border px-4 py-2 text-sm ${className}`}
    >
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-3 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}

const compactButtonClassName =
  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const primaryCompactButtonClassName =
  "rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]";

const smallActionClassName =
  "rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]";

function formatHallCompactMeta(hall: {
  outlineJson?: string | null;
  areaSqMeters?: number | null;
}) {
  const geometry = getHallGeometrySummary(
    hall.outlineJson,
    hall.areaSqMeters ?? 0,
  );
  if (!geometry.hasOutline) {
    return formatAreaSqMeters(geometry.areaSqMeters, 0);
  }

  return `${formatHallFootprint(geometry)} · ${formatAreaSqMeters(
    geometry.areaSqMeters,
    0,
  )}`;
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
