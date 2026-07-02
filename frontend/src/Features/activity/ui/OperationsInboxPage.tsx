import { type ReactNode, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FailureSeverity, FailureStatus } from "../../incidents/api/contracts";
import { ImprovementStatus } from "../../lean/api/contracts";
import { MaintenanceOccurrenceStatus } from "../../maintenance/api/contracts";
import {
  WorkOrderSource,
  WorkOrderStatus,
} from "../../work-orders/api/contracts";
import { useDashboardOverviewData } from "../../dashboard/model/useDashboardOverviewData";

type InboxTone = "danger" | "warning" | "info" | "success" | "neutral";
type InboxPanelMode = "all" | "incidents" | "maintenance" | "orders" | "lean";
type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

type InboxItem = {
  id: string;
  title: string;
  subtitle: string;
  dueLabel: string;
  tone: InboxTone;
  badge: string;
  actionTo: string;
  secondaryTo?: string;
  secondaryLabel?: string;
  group: InboxPanelMode;
  priority: number;
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

function inboxToneClass(tone: InboxTone) {
  const classes: Record<InboxTone, string> = {
    danger: "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
    warning: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
    info: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
    success: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
    neutral: "border-slate-800 bg-slate-950/60 text-slate-100",
  };

  return classes[tone];
}

function panelLabel(mode: InboxPanelMode) {
  switch (mode) {
    case "all":
      return "Wszystko";
    case "incidents":
      return "Awarie";
    case "maintenance":
      return "Przeglądy";
    case "orders":
      return "Zlecenia";
    case "lean":
      return "Kaizen";
    default:
      return "Wszystko";
  }
}

export function OperationsInboxPage() {
  const [searchParams] = useSearchParams();
  const selectedAssetId = searchParams.get("assetId");
  const [panelMode, setPanelMode] = useState<InboxPanelMode>("all");

  const {
    incidents,
    workOrders,
    maintenancePlans,
    improvementIdeas,
    loading,
    error,
    reload,
  } = useDashboardOverviewData();

  const sections = useMemo(() => {
    const urgentIncidents: InboxItem[] = incidents
      .filter(
        (incident) =>
          (!selectedAssetId || incident.assetId === selectedAssetId) &&
          incident.status !== FailureStatus.Resolved &&
          incident.status !== FailureStatus.Closed &&
          (incident.severity === FailureSeverity.Critical ||
            incident.causesDowntime),
      )
      .sort(
        (left, right) =>
          Date.parse(right.reportedAtUtc) - Date.parse(left.reportedAtUtc),
      )
      .slice(0, 6)
      .map((incident) => ({
        id: incident.id,
        title: incident.title,
        subtitle:
          incident.failureCauseCategoryName ??
          "Awaria bez przypisanej przyczyny",
        dueLabel: new Date(incident.reportedAtUtc).toLocaleString("pl-PL"),
        tone:
          incident.severity === FailureSeverity.Critical ? "danger" : "warning",
        badge:
          incident.severity === FailureSeverity.Critical
            ? "Awaria krytyczna"
            : incident.causesDowntime
              ? "Przestój"
              : "Awaria",
        actionTo: `/incidents/${incident.id}`,
        secondaryTo: incident.assetId
          ? `/machines/${incident.assetId}`
          : undefined,
        secondaryLabel: incident.assetId ? "Maszyna" : undefined,
        group: "incidents",
        priority: incident.severity === FailureSeverity.Critical ? 100 : 90,
      }));

    const maintenanceActions: InboxItem[] = maintenancePlans
      .filter(
        (plan) =>
          (!selectedAssetId || plan.assetId === selectedAssetId) &&
          (plan.currentStatus === MaintenanceOccurrenceStatus.Overdue ||
            plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon),
      )
      .sort((left, right) => {
        const leftValue = Date.parse(left.nextDueAtUtc ?? left.startsAtUtc);
        const rightValue = Date.parse(right.nextDueAtUtc ?? right.startsAtUtc);
        return leftValue - rightValue;
      })
      .slice(0, 6)
      .map((plan) => ({
        id: plan.id,
        title: plan.title,
        subtitle: `${plan.assetName} (${plan.assetCode})`,
        dueLabel:
          plan.nextDueAtUtc != null
            ? new Date(plan.nextDueAtUtc).toLocaleString("pl-PL")
            : `Próg licznika: ${plan.nextDueMeterValue ?? "-"}`,
        tone:
          plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
            ? "danger"
            : "warning",
        badge:
          plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
            ? "Przegląd po terminie"
            : "Przegląd wkrótce",
        actionTo: `/maintenance?planId=${encodeURIComponent(plan.id)}`,
        secondaryTo: `/machines/${plan.assetId}`,
        secondaryLabel: "Maszyna",
        group: "maintenance",
        priority:
          plan.currentStatus === MaintenanceOccurrenceStatus.Overdue ? 85 : 70,
      }));

    const preventiveOrders: InboxItem[] = workOrders
      .filter(
        (workOrder) =>
          (!selectedAssetId || workOrder.assetId === selectedAssetId) &&
          workOrder.status !== WorkOrderStatus.Done &&
          workOrder.status !== WorkOrderStatus.Cancelled &&
          workOrder.source === WorkOrderSource.PreventiveMaintenance,
      )
      .sort((left, right) => {
        const leftValue = Date.parse(left.dueAtUtc ?? left.requestedAtUtc);
        const rightValue = Date.parse(right.dueAtUtc ?? right.requestedAtUtc);
        return leftValue - rightValue;
      })
      .slice(0, 6)
      .map((workOrder) => ({
        id: workOrder.id,
        title: workOrder.title,
        subtitle: workOrder.number,
        dueLabel: new Date(
          workOrder.dueAtUtc ?? workOrder.requestedAtUtc,
        ).toLocaleString("pl-PL"),
        tone: workOrder.autoCreated ? "warning" : "info",
        badge: workOrder.autoCreated ? "Auto-zlecenie" : "Zlecenie prewencyjne",
        actionTo: `/work-orders/${workOrder.id}`,
        secondaryTo: workOrder.assetId
          ? `/machines/${workOrder.assetId}`
          : undefined,
        secondaryLabel: workOrder.assetId ? "Maszyna" : undefined,
        group: "orders",
        priority: workOrder.autoCreated ? 65 : 55,
      }));

    const dueIdeas: InboxItem[] = (selectedAssetId ? [] : improvementIdeas)
      .filter(
        (idea) =>
          idea.status !== ImprovementStatus.Implemented &&
          idea.status !== ImprovementStatus.Rejected &&
          !!idea.dueDateUtc,
      )
      .sort(
        (left, right) =>
          Date.parse(left.dueDateUtc!) - Date.parse(right.dueDateUtc!),
      )
      .slice(0, 6)
      .map((idea) => ({
        id: idea.id,
        title: idea.title,
        subtitle: idea.departmentName ?? "Bez działu",
        dueLabel: new Date(idea.dueDateUtc!).toLocaleDateString("pl-PL"),
        tone: idea.isOverdue ? "danger" : idea.isDueSoon ? "warning" : "info",
        badge: idea.isOverdue ? "Kaizen po terminie" : "Kaizen do realizacji",
        actionTo: "/lean",
        secondaryTo: "/departments",
        secondaryLabel: "Działy",
        group: "lean",
        priority: idea.isOverdue ? 60 : idea.isDueSoon ? 45 : 25,
      }));

    return {
      urgentIncidents,
      maintenanceActions,
      preventiveOrders,
      dueIdeas,
    };
  }, [
    improvementIdeas,
    incidents,
    maintenancePlans,
    selectedAssetId,
    workOrders,
  ]);

  const allItems = useMemo(
    () =>
      [
        ...sections.urgentIncidents,
        ...sections.maintenanceActions,
        ...sections.preventiveOrders,
        ...sections.dueIdeas,
      ].sort((left, right) => right.priority - left.priority),
    [sections],
  );

  const visibleItems = useMemo(() => {
    if (panelMode === "all") {
      return allItems;
    }

    return allItems.filter((item) => item.group === panelMode);
  }, [allItems, panelMode]);

  const totalTasks = allItems.length;
  const criticalTasks = allItems.filter(
    (item) => item.tone === "danger",
  ).length;
  const warningTasks = allItems.filter(
    (item) => item.tone === "warning",
  ).length;

  return (
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
                  {totalTasks} działań
                </span>

                {criticalTasks > 0 ? (
                  <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                    {criticalTasks} krytyczne
                  </span>
                ) : null}
              </div>

              <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                Do zrobienia dziś
              </h1>

              <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                Skondensowana lista spraw do reakcji: awarie, przeglądy,
                zlecenia prewencyjne i tematy Lean. Widok można zawęzić do
                jednej maszyny.
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

              <Link
                to="/"
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Dashboard
              </Link>

              {selectedAssetId ? (
                <Link
                  to="/activity"
                  className="rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-3 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-400/40 hover:bg-amber-400/[0.12]"
                >
                  Wyczyść filtr maszyny
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Łącznie"
              value={String(totalTasks)}
              hint={
                selectedAssetId
                  ? "Widok jednej maszyny"
                  : "Wszystkie priorytety"
              }
              tone="cyan"
            />

            <SummaryCard
              label="Krytyczne"
              value={String(criticalTasks)}
              hint="Wymaga reakcji"
              tone={criticalTasks > 0 ? "rose" : "slate"}
            />

            <SummaryCard
              label="Ostrzeżenia"
              value={String(warningTasks)}
              hint="Blisko terminu"
              tone={warningTasks > 0 ? "amber" : "slate"}
            />

            <SummaryCard
              label="Awarie"
              value={String(sections.urgentIncidents.length)}
              hint="Krytyczne i przestoje"
              tone={sections.urgentIncidents.length > 0 ? "rose" : "slate"}
            />

            <SummaryCard
              label="Prewencja"
              value={String(
                sections.maintenanceActions.length +
                  sections.preventiveOrders.length,
              )}
              hint="Przeglądy i zlecenia"
              tone="emerald"
            />
          </div>
        </section>

        {error ? (
          <div className="shrink-0 rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-2 text-sm text-rose-100">
            {error.message}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(390px,0.85fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Kolejka priorytetów
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Posortowane według pilności. Zacznij od góry.
                  </p>
                </div>

                <div className="grid grid-cols-5 gap-1 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                  {(
                    [
                      "all",
                      "incidents",
                      "maintenance",
                      "orders",
                      "lean",
                    ] as InboxPanelMode[]
                  ).map((mode) => (
                    <PanelTab
                      key={mode}
                      active={panelMode === mode}
                      onClick={() => setPanelMode(mode)}
                    >
                      {panelLabel(mode)}
                    </PanelTab>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Ładowanie działań...
                </div>
              ) : null}

              {!loading ? (
                <div className="space-y-2">
                  {visibleItems.map((item, index) => (
                    <InboxPriorityItem
                      key={`${item.group}-${item.id}`}
                      item={item}
                      index={index}
                    />
                  ))}

                  {visibleItems.length === 0 ? (
                    <EmptyBox text="Brak działań w wybranym zakresie." />
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="grid min-h-0 gap-3 overflow-hidden xl:grid-rows-2">
            <InboxSection
              title="Awarie i przeglądy"
              description="Najbardziej ryzykowne operacyjnie sprawy."
              items={[
                ...sections.urgentIncidents,
                ...sections.maintenanceActions,
              ]}
              emptyText="Brak krytycznych awarii, przestojów lub przeglądów w progu alarmowym."
            />

            <InboxSection
              title="Zlecenia i Lean"
              description="Działania uzupełniające do zamknięcia dnia."
              items={[...sections.preventiveOrders, ...sections.dueIdeas]}
              emptyText="Brak aktywnych zleceń prewencyjnych i tematów Lean wymagających uwagi."
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

function InboxPriorityItem({
  item,
  index,
}: {
  item: InboxItem;
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

              <InboxBadge tone={item.tone}>{item.badge}</InboxBadge>
            </div>

            <div className="mt-1 line-clamp-1 text-xs text-slate-500">
              {item.subtitle}
            </div>

            <div className="mt-2 text-xs text-slate-400">
              Termin / czas: {item.dueLabel}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Link
            to={item.actionTo}
            className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
          >
            Otwórz
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

function InboxSection({
  title,
  description,
  items,
  emptyText,
}: {
  title: string;
  description: string;
  items: InboxItem[];
  emptyText: string;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
              {title}
            </h2>

            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>

          <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs font-semibold text-slate-300">
            {items.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="space-y-2">
          {items.map((item) => (
            <CompactInboxItem key={`${item.group}-${item.id}`} item={item} />
          ))}

          {items.length === 0 ? <EmptyBox text={emptyText} /> : null}
        </div>
      </div>
    </section>
  );
}

function CompactInboxItem({ item }: { item: InboxItem }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-semibold text-white">
            {item.title}
          </div>

          <div className="mt-1 line-clamp-1 text-xs text-slate-500">
            {item.subtitle}
          </div>

          <div className="mt-2 text-xs text-slate-400">{item.dueLabel}</div>
        </div>

        <InboxBadge tone={item.tone}>{item.badge}</InboxBadge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={item.actionTo}
          className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
        >
          Otwórz
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

function InboxBadge({
  tone,
  children,
}: {
  tone: InboxTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${inboxToneClass(
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-3 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}
