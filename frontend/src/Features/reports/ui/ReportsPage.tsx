import { type ReactNode, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDashboardOverviewData } from "../../dashboard/model/useDashboardOverviewData";
import {
  formatAreaSqMeters,
  formatHallFootprint,
  getHallGeometrySummary,
} from "../../halls/lib/hallGeometry";
import { FailureSeverity, FailureStatus } from "../../incidents/api/contracts";
import { useInventoryWorkspace } from "../../inventory/model/useInventoryWorkspace";
import { ImprovementStatus } from "../../lean/api/contracts";
import { AssetStatus, AssetType } from "../../machines/api/contracts";
import { MaintenanceOccurrenceStatus } from "../../maintenance/api/contracts";
import {
  WorkOrderSource,
  WorkOrderStatus,
} from "../../work-orders/api/contracts";

const machineStatusLabels: Record<AssetStatus, string> = {
  [AssetStatus.Available]: "Dostępne",
  [AssetStatus.InUse]: "W użyciu",
  [AssetStatus.InMaintenance]: "W serwisie",
  [AssetStatus.Broken]: "Uszkodzone",
  [AssetStatus.Retired]: "Wycofane",
};

const machineStatusOrder = [
  AssetStatus.Available,
  AssetStatus.InUse,
  AssetStatus.InMaintenance,
  AssetStatus.Broken,
  AssetStatus.Retired,
] as const;

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";
type ReportPanelMode =
  | "overview"
  | "halls"
  | "inventory"
  | "machines"
  | "priorities";

export function ReportsPage() {
  const [panelMode, setPanelMode] = useState<ReportPanelMode>("overview");

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

    const overduePlans = maintenancePlans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.Overdue,
    );

    const dueSoonPlans = maintenancePlans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon,
    );

    const preventiveOrders = activeWorkOrders.filter(
      (workOrder) => workOrder.source === WorkOrderSource.PreventiveMaintenance,
    );

    const activeIdeas = improvementIdeas.filter(
      (idea) =>
        idea.status !== ImprovementStatus.Implemented &&
        idea.status !== ImprovementStatus.Rejected,
    );

    const criticalIncidents = openIncidents.filter(
      (incident) => incident.severity === FailureSeverity.Critical,
    ).length;

    const downtimeIncidents = openIncidents.filter(
      (incident) => incident.causesDowntime,
    ).length;

    const machineAttentionCount = machines.filter(
      (machine) =>
        machine.status === AssetStatus.Broken ||
        machine.status === AssetStatus.InMaintenance,
    ).length;

    return {
      machines,
      openIncidents,
      activeWorkOrders,
      overduePlans,
      dueSoonPlans,
      preventiveOrders,
      activeIdeas,
      criticalIncidents,
      downtimeIncidents,
      machineAttentionCount,
      hallArea: halls.reduce((sum, hall) => sum + (hall.areaSqMeters ?? 0), 0),
      sectionsCount: halls.reduce(
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
        .slice(0, 4),
      urgentPlans: [...maintenancePlans]
        .filter(
          (plan) =>
            plan.currentStatus === MaintenanceOccurrenceStatus.Overdue ||
            plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon,
        )
        .sort((left, right) => {
          const leftDate = Date.parse(left.nextDueAtUtc ?? left.startsAtUtc);
          const rightDate = Date.parse(right.nextDueAtUtc ?? right.startsAtUtc);

          return leftDate - rightDate;
        })
        .slice(0, 4),
      topIdeas: [...activeIdeas]
        .sort((left, right) => right.priorityScore - left.priorityScore)
        .slice(0, 4),
      machineStatuses: machineStatusOrder.map((status) => ({
        status,
        count: machines.filter((machine) => machine.status === status).length,
      })),
      employeeCoverage: employees.length
        ? Math.round(
            (employees.filter((employee) => employee.skills.length > 0).length /
              employees.length) *
              100,
          )
        : 0,
    };
  }, [
    assets,
    employees,
    halls,
    improvementIdeas,
    incidents,
    maintenancePlans,
    workOrders,
  ]);

  return (
    <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  Analityka
                </span>

                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  {metrics.machines.length} maszyn
                </span>

                {metrics.criticalIncidents > 0 ? (
                  <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                    {metrics.criticalIncidents} krytyczne awarie
                  </span>
                ) : null}
              </div>

              <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                Raporty operacyjne
              </h1>

              <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                Przekrój przez hale, serwis, awarie, kompetencje i magazyn. Ten
                ekran ma szybko pokazać, gdzie rośnie ryzyko operacyjne.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => void reload()}
                className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
              >
                Odśwież
              </button>

              <Link to="/" className={headerButtonClassName}>
                Dashboard
              </Link>

              <Link to="/inventory" className={headerButtonClassName}>
                Magazyn
              </Link>

              <Link
                to="/editor"
                className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
              >
                Edytor layoutu
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-8">
            <SummaryCard
              label="Hale"
              value={String(halls.length)}
              hint={`${metrics.sectionsCount} sekcji`}
              tone="cyan"
            />

            <SummaryCard
              label="Maszyny"
              value={String(metrics.machines.length)}
              hint={`${metrics.machineAttentionCount} wymagają uwagi`}
              tone={metrics.machineAttentionCount > 0 ? "amber" : "emerald"}
            />

            <SummaryCard
              label="Otwarte awarie"
              value={String(metrics.openIncidents.length)}
              hint={`Krytyczne: ${metrics.criticalIncidents}`}
              tone={metrics.criticalIncidents > 0 ? "rose" : "slate"}
            />

            <SummaryCard
              label="Aktywne zlecenia"
              value={String(metrics.activeWorkOrders.length)}
              hint={`Prewencyjne: ${metrics.preventiveOrders.length}`}
              tone={metrics.activeWorkOrders.length > 0 ? "amber" : "slate"}
            />

            <SummaryCard
              label="Przeglądy po terminie"
              value={String(metrics.overduePlans.length)}
              hint={`Wkrótce: ${metrics.dueSoonPlans.length}`}
              tone={metrics.overduePlans.length > 0 ? "rose" : "slate"}
            />

            <SummaryCard
              label="Niski stock"
              value={String(inventory.metrics.lowStockCount)}
              hint={`${inventory.metrics.openProcurementsCount} zakupów`}
              tone={inventory.metrics.lowStockCount > 0 ? "amber" : "slate"}
            />

            <SummaryCard
              label="Pozycje dla serwisu"
              value={String(inventory.metrics.itemsLinkedToOperations)}
              hint={`${inventory.metrics.reservedUnits} zarezerw.`}
              tone={
                inventory.metrics.itemsLinkedToOperations > 0
                  ? "emerald"
                  : "slate"
              }
            />

            <SummaryCard
              label="Kompetencje"
              value={`${metrics.employeeCoverage}%`}
              hint={`${employees.length} pracowników`}
              tone={metrics.employeeCoverage >= 70 ? "emerald" : "amber"}
            />
          </div>
        </section>

        {error ? <AlertBox tone="amber">{error.message}</AlertBox> : null}

        {loading || !inventory.isReady ? (
          <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
            Ładowanie raportów...
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Ryzyka i priorytety
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Najważniejsze elementy raportu, które mogą wymagać reakcji.
                  </p>
                </div>

                <Link
                  to="/activity"
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Do zrobienia dziś
                </Link>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="grid gap-3 xl:grid-cols-2">
                <ReportCard
                  title="Ryzyka magazynowe"
                  description="Pozycje, które warto uzupełnić zanim zabraknie ich dla serwisu."
                  action={
                    <Link
                      to="/inventory?low=1"
                      className={smallActionClassName}
                    >
                      Magazyn
                    </Link>
                  }
                >
                  <div className="space-y-2">
                    {inventory.suggestions.slice(0, 5).map((suggestion) => {
                      const item = inventory.items.find(
                        (entry) => entry.id === suggestion.itemId,
                      );

                      if (!item) return null;

                      return (
                        <ListCard
                          key={suggestion.itemId}
                          title={item.name}
                          meta={`${suggestion.reason} · zakup: ${suggestion.suggestedQuantity} ${item.unit}`}
                          tone={
                            suggestion.urgency === "high" ? "rose" : "amber"
                          }
                          links={[
                            { to: "/inventory?low=1", label: "Magazyn" },
                            item.linkedAssetId
                              ? {
                                  to: `/machines/${item.linkedAssetId}`,
                                  label: "Maszyna",
                                }
                              : null,
                          ]}
                        />
                      );
                    })}

                    {inventory.suggestions.length === 0 ? (
                      <EmptyState text="Brak pozycji wymagających pilnej reakcji magazynu." />
                    ) : null}
                  </div>
                </ReportCard>

                <ReportCard
                  title="Przeglądy alarmowe"
                  description="Plany po terminie albo zbliżające się do progu alarmowego."
                  action={
                    <Link to="/maintenance" className={smallActionClassName}>
                      Przeglądy
                    </Link>
                  }
                >
                  <div className="space-y-2">
                    {metrics.urgentPlans.map((plan) => (
                      <ListCard
                        key={plan.id}
                        title={plan.title}
                        meta={`${plan.assetName} (${plan.assetCode}) · termin ${formatDate(
                          plan.nextDueAtUtc ?? plan.startsAtUtc,
                        )}`}
                        tone={
                          plan.currentStatus ===
                          MaintenanceOccurrenceStatus.Overdue
                            ? "rose"
                            : "amber"
                        }
                        links={[
                          { to: "/maintenance", label: "Przeglądy" },
                          { to: `/machines/${plan.assetId}`, label: "Maszyna" },
                        ]}
                      />
                    ))}

                    {metrics.urgentPlans.length === 0 ? (
                      <EmptyState text="Brak przeglądów w stanie alarmowym." />
                    ) : null}
                  </div>
                </ReportCard>

                <ReportCard
                  title="Priorytety Lean"
                  description="Aktywne usprawnienia o najwyższym wyniku priorytetu."
                  action={
                    <Link to="/lean" className={smallActionClassName}>
                      Lean
                    </Link>
                  }
                >
                  <div className="space-y-2">
                    {metrics.topIdeas.map((idea) => (
                      <ListCard
                        key={idea.id}
                        title={idea.title}
                        meta={`${idea.departmentName ?? "Bez działu"} · priorytet ${idea.priorityScore}`}
                        tone={idea.priorityScore >= 65 ? "amber" : "slate"}
                        links={[{ to: "/lean", label: "Lean" }]}
                      />
                    ))}

                    {metrics.topIdeas.length === 0 ? (
                      <EmptyState text="Brak aktywnych usprawnień do pokazania." />
                    ) : null}
                  </div>
                </ReportCard>

                <ReportCard
                  title="Hale do przeglądu"
                  description="Największe obszary i szybkie przejście do layoutu."
                  action={
                    <Link to="/halls" className={smallActionClassName}>
                      Hale
                    </Link>
                  }
                >
                  <div className="space-y-2">
                    {metrics.topHalls.map((hall) => (
                      <ListCard
                        key={hall.id}
                        title={`${hall.name}${hall.code ? ` (${hall.code})` : ""}`}
                        meta={`${hall.sectionsCount} sekcji · ${formatHallCompactMeta(
                          hall,
                        )}`}
                        tone="cyan"
                        links={[
                          { to: "/halls", label: "Lista hal" },
                          {
                            to: `/editor?hallId=${encodeURIComponent(hall.id)}`,
                            label: "Layout",
                          },
                        ]}
                      />
                    ))}

                    {metrics.topHalls.length === 0 ? (
                      <EmptyState text="Brak hal do wyświetlenia." />
                    ) : null}
                  </div>
                </ReportCard>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="grid grid-cols-5 gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                <PanelTab
                  active={panelMode === "overview"}
                  onClick={() => setPanelMode("overview")}
                >
                  Wyniki
                </PanelTab>

                <PanelTab
                  active={panelMode === "halls"}
                  onClick={() => setPanelMode("halls")}
                >
                  Hale
                </PanelTab>

                <PanelTab
                  active={panelMode === "inventory"}
                  onClick={() => setPanelMode("inventory")}
                >
                  Magazyn
                </PanelTab>

                <PanelTab
                  active={panelMode === "machines"}
                  onClick={() => setPanelMode("machines")}
                >
                  Maszyny
                </PanelTab>

                <PanelTab
                  active={panelMode === "priorities"}
                  onClick={() => setPanelMode("priorities")}
                >
                  Priorytety
                </PanelTab>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {panelMode === "overview" ? (
                <OverviewPanel
                  mttrHours={incidentAnalytics?.mttrHours}
                  downtimeMinutes={incidentAnalytics?.totalDowntimeMinutes ?? 0}
                  activeIdeas={metrics.activeIdeas.length}
                  stockValue={inventory.metrics.estimatedValue}
                />
              ) : null}

              {panelMode === "halls" ? (
                <HallsPanel
                  halls={metrics.topHalls}
                  totalArea={metrics.hallArea}
                  sectionsCount={metrics.sectionsCount}
                />
              ) : null}

              {panelMode === "inventory" ? (
                <InventoryPanel inventory={inventory} />
              ) : null}

              {panelMode === "machines" ? (
                <MachinesPanel
                  statuses={metrics.machineStatuses}
                  total={metrics.machines.length}
                />
              ) : null}

              {panelMode === "priorities" ? (
                <PrioritiesPanel
                  urgentPlans={metrics.urgentPlans}
                  topIdeas={metrics.topIdeas}
                  incidentAnalytics={incidentAnalytics}
                  inventory={inventory}
                />
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({
  mttrHours,
  downtimeMinutes,
  activeIdeas,
  stockValue,
}: {
  mttrHours?: number | null;
  downtimeMinutes: number;
  activeIdeas: number;
  stockValue: number;
}) {
  return (
    <PanelShell
      title="Wyniki i wskaźniki"
      description="Skrót najważniejszych wartości z raportu."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoTile
          label="MTTR"
          value={mttrHours != null ? `${mttrHours.toFixed(1)} h` : "-"}
          hint={`Downtime: ${formatMinutes(downtimeMinutes)}`}
          tone="amber"
        />

        <InfoTile
          label="Aktywne usprawnienia"
          value={String(activeIdeas)}
          hint="Otwarte tematy Lean i Kaizen"
          tone="cyan"
        />

        <InfoTile
          label="Wartość stocku"
          value={formatCurrency(stockValue)}
          hint="Szacunek aktywnych pozycji"
          tone="emerald"
        />

        <InfoTile
          label="Ryzyko operacyjne"
          value={downtimeMinutes > 0 ? "Aktywne" : "Niskie"}
          hint="Na podstawie przestoju"
          tone={downtimeMinutes > 0 ? "rose" : "emerald"}
        />
      </div>
    </PanelShell>
  );
}

function HallsPanel({
  halls,
  totalArea,
  sectionsCount,
}: {
  halls: Array<{
    id: string;
    name: string;
    code?: string | null;
    sectionsCount?: number | null;
    areaSqMeters?: number | null;
  }>;
  totalArea: number;
  sectionsCount: number;
}) {
  return (
    <PanelShell
      title="Hale i layouty"
      description="Największe obszary do regularnego przeglądu."
      action={
        <Link to="/halls" className={smallActionClassName}>
          Hale
        </Link>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoTile
          label="Powierzchnia"
          value={formatAreaSqMeters(totalArea, 0)}
          hint="Łącznie"
          tone="cyan"
        />

        <InfoTile
          label="Sekcje"
          value={String(sectionsCount)}
          hint="Łącznie"
          tone="violet"
        />
      </div>

      <div className="mt-3 space-y-2">
        {halls.map((hall) => (
          <ListCard
            key={hall.id}
            title={`${hall.name}${hall.code ? ` (${hall.code})` : ""}`}
            meta={`${hall.sectionsCount} sekcji · ${formatHallCompactMeta(
              hall,
            )}`}
            tone="cyan"
            links={[
              { to: "/halls", label: "Lista hal" },
              {
                to: `/editor?hallId=${encodeURIComponent(hall.id)}`,
                label: "Layout",
              },
            ]}
          />
        ))}

        {halls.length === 0 ? (
          <EmptyState text="Brak hal do wyświetlenia." />
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
      title="Ryzyka magazynowe"
      description="Pozycje, które warto uzupełnić przed blokadą serwisu."
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
          hint="Pozycje poniżej minimum"
          tone={inventory.metrics.lowStockCount > 0 ? "amber" : "emerald"}
        />

        <InfoTile
          label="Zakupy"
          value={String(inventory.metrics.openProcurementsCount)}
          hint="W toku"
          tone="cyan"
        />

        <InfoTile
          label="Serwis"
          value={String(inventory.metrics.itemsLinkedToOperations)}
          hint="Pozycje powiązane"
          tone="violet"
        />

        <InfoTile
          label="Rezerwacje"
          value={String(inventory.metrics.reservedUnits)}
          hint="Sztuki zarezerwowane"
          tone="slate"
        />
      </div>

      <div className="mt-3 space-y-2">
        {inventory.suggestions.slice(0, 5).map((suggestion) => {
          const item = inventory.items.find(
            (entry) => entry.id === suggestion.itemId,
          );

          if (!item) return null;

          return (
            <ListCard
              key={suggestion.itemId}
              title={item.name}
              meta={`${suggestion.reason} · zakup: ${suggestion.suggestedQuantity} ${item.unit}`}
              tone={suggestion.urgency === "high" ? "rose" : "amber"}
              links={[
                { to: "/inventory?low=1", label: "Magazyn" },
                item.linkedAssetId
                  ? { to: `/machines/${item.linkedAssetId}`, label: "Maszyna" }
                  : null,
              ]}
            />
          );
        })}

        {inventory.suggestions.length === 0 ? (
          <EmptyState text="Brak pozycji wymagających pilnej reakcji magazynu." />
        ) : null}
      </div>
    </PanelShell>
  );
}

function MachinesPanel({
  statuses,
  total,
}: {
  statuses: Array<{ status: AssetStatus; count: number }>;
  total: number;
}) {
  return (
    <PanelShell
      title="Status maszyn"
      description="Rozkład statusów dla całego parku maszynowego."
      action={
        <Link to="/machines" className={smallActionClassName}>
          Maszyny
        </Link>
      }
    >
      <div className="space-y-3">
        {statuses.map(({ status, count }) => (
          <ProgressRow
            key={status}
            label={machineStatusLabels[status]}
            value={count}
            total={total}
            tone={
              status === AssetStatus.Broken
                ? "rose"
                : status === AssetStatus.InMaintenance
                  ? "amber"
                  : status === AssetStatus.Available
                    ? "emerald"
                    : "cyan"
            }
          />
        ))}
      </div>
    </PanelShell>
  );
}

function PrioritiesPanel({
  urgentPlans,
  topIdeas,
  incidentAnalytics,
  inventory,
}: {
  urgentPlans: Array<{
    id: string;
    title: string;
    assetId: string;
    assetName: string;
    assetCode: string;
    nextDueAtUtc?: string | null;
    startsAtUtc: string;
    currentStatus: MaintenanceOccurrenceStatus;
  }>;
  topIdeas: Array<{
    id: string;
    title: string;
    departmentName?: string | null;
    priorityScore: number;
  }>;
  incidentAnalytics: ReturnType<
    typeof useDashboardOverviewData
  >["incidentAnalytics"];
  inventory: ReturnType<typeof useInventoryWorkspace>;
}) {
  return (
    <PanelShell
      title="Przeglądy i Lean"
      description="Rzeczy, które najczęściej trafią na dzisiejszą listę zadań."
      action={
        <Link to="/activity" className={smallActionClassName}>
          Do zrobienia
        </Link>
      }
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <InfoTile
          label="MTTR"
          value={
            incidentAnalytics?.mttrHours != null
              ? `${incidentAnalytics.mttrHours.toFixed(1)} h`
              : "-"
          }
          hint={`Downtime: ${formatMinutes(
            incidentAnalytics?.totalDowntimeMinutes ?? 0,
          )}`}
          tone="amber"
        />

        <InfoTile
          label="Usprawnienia"
          value={String(topIdeas.length)}
          hint="Pokazane priorytety"
          tone="cyan"
        />

        <InfoTile
          label="Stock"
          value={formatCurrency(inventory.metrics.estimatedValue)}
          hint="Szacowana wartość"
          tone="emerald"
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <div className="space-y-2">
          {urgentPlans.map((plan) => (
            <ListCard
              key={plan.id}
              title={plan.title}
              meta={`${plan.assetName} (${plan.assetCode}) · termin ${formatDate(
                plan.nextDueAtUtc ?? plan.startsAtUtc,
              )}`}
              tone={
                plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
                  ? "rose"
                  : "amber"
              }
              links={[
                { to: "/maintenance", label: "Przeglądy" },
                { to: `/machines/${plan.assetId}`, label: "Maszyna" },
              ]}
            />
          ))}

          {urgentPlans.length === 0 ? (
            <EmptyState text="Brak przeglądów w stanie alarmowym." />
          ) : null}
        </div>

        <div className="space-y-2">
          {topIdeas.map((idea) => (
            <ListCard
              key={idea.id}
              title={idea.title}
              meta={`${idea.departmentName ?? "Bez działu"} · priorytet ${
                idea.priorityScore
              }`}
              tone={idea.priorityScore >= 65 ? "amber" : "slate"}
              links={[{ to: "/lean", label: "Lean" }]}
            />
          ))}

          {topIdeas.length === 0 ? (
            <EmptyState text="Brak aktywnych usprawnień do pokazania." />
          ) : null}
        </div>
      </div>
    </PanelShell>
  );
}

function ReportCard({
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
    <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
            {title}
          </h3>

          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        {action}
      </div>

      {children}
    </section>
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

function ListCard({
  title,
  meta,
  links,
  tone = "slate",
}: {
  title: string;
  meta: string;
  links: Array<{ to: string; label: string } | null>;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass(tone)}`}>
      <div className="line-clamp-1 text-sm font-semibold text-white">
        {title}
      </div>
      <div className="mt-1 line-clamp-2 text-xs opacity-70">{meta}</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {links.filter(Boolean).map((link) => (
          <Link
            key={`${link!.to}-${link!.label}`}
            to={link!.to}
            className={compactButtonClassName}
          >
            {link!.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  tone = "cyan",
}: {
  label: string;
  value: number;
  total: number;
  tone?: Tone;
}) {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-white">{label}</span>
        <span className="shrink-0 text-slate-400">
          {value}
          {total > 0 ? ` · ${Math.round(ratio * 100)}%` : ""}
        </span>
      </div>

      <div className="h-2 rounded-full bg-slate-800">
        <div
          className={[
            "h-2 rounded-full",
            tone === "rose"
              ? "bg-rose-400/70"
              : tone === "amber"
                ? "bg-amber-400/70"
                : tone === "emerald"
                  ? "bg-emerald-400/70"
                  : tone === "violet"
                    ? "bg-violet-400/70"
                    : "bg-cyan-400/70",
          ].join(" ")}
          style={{ width: `${Math.max(ratio * 100, value > 0 ? 8 : 0)}%` }}
        />
      </div>
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

const headerButtonClassName =
  "rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const compactButtonClassName =
  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("pl-PL");
}

function formatMinutes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 min";
  if (value >= 60) return `${(value / 60).toFixed(1)} h`;

  return `${value} min`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}
