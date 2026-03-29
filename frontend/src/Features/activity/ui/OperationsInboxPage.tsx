import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { OperationalStatusBadge } from "../../../shared/ui/OperationalStatusBadge";
import { FailureSeverity, FailureStatus } from "../../incidents/api/contracts";
import { ImprovementStatus } from "../../lean/api/contracts";
import { MaintenanceOccurrenceStatus } from "../../maintenance/api/contracts";
import { WorkOrderSource, WorkOrderStatus } from "../../work-orders/api/contracts";
import { useDashboardOverviewData } from "../../dashboard/model/useDashboardOverviewData";

type InboxTone = "danger" | "warning" | "info" | "success" | "neutral";

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
};

export function OperationsInboxPage() {
  const [searchParams] = useSearchParams();
  const selectedAssetId = searchParams.get("assetId");

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
            incident.causesDowntime)
      )
      .sort(
        (left, right) =>
          Date.parse(right.reportedAtUtc) - Date.parse(left.reportedAtUtc)
      )
      .slice(0, 6)
      .map((incident) => ({
        id: incident.id,
        title: incident.title,
        subtitle:
          incident.failureCauseCategoryName ?? "Awaria bez przypisanej przyczyny",
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
        secondaryTo: incident.assetId ? `/machines/${incident.assetId}` : undefined,
        secondaryLabel: incident.assetId ? "Maszyna" : undefined,
      }));

    const maintenanceActions: InboxItem[] = maintenancePlans
      .filter(
        (plan) =>
          (!selectedAssetId || plan.assetId === selectedAssetId) &&
          (plan.currentStatus === MaintenanceOccurrenceStatus.Overdue ||
            plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon)
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
      }));

    const preventiveOrders: InboxItem[] = workOrders
      .filter(
        (workOrder) =>
          (!selectedAssetId || workOrder.assetId === selectedAssetId) &&
          workOrder.status !== WorkOrderStatus.Done &&
          workOrder.status !== WorkOrderStatus.Cancelled &&
          workOrder.source === WorkOrderSource.PreventiveMaintenance
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
          workOrder.dueAtUtc ?? workOrder.requestedAtUtc
        ).toLocaleString("pl-PL"),
        tone: workOrder.autoCreated ? "warning" : "info",
        badge: workOrder.autoCreated ? "Auto-zlecenie" : "Zlecenie prewencyjne",
        actionTo: `/work-orders/${workOrder.id}`,
        secondaryTo: workOrder.assetId
          ? `/machines/${workOrder.assetId}`
          : undefined,
        secondaryLabel: workOrder.assetId ? "Maszyna" : undefined,
      }));

    const dueIdeas: InboxItem[] = (selectedAssetId ? [] : improvementIdeas)
      .filter(
        (idea) =>
          idea.status !== ImprovementStatus.Implemented &&
          idea.status !== ImprovementStatus.Rejected &&
          !!idea.dueDateUtc
      )
      .sort(
        (left, right) => Date.parse(left.dueDateUtc!) - Date.parse(right.dueDateUtc!)
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
      }));

    return {
      urgentIncidents,
      maintenanceActions,
      preventiveOrders,
      dueIdeas,
    };
  }, [improvementIdeas, incidents, maintenancePlans, selectedAssetId, workOrders]);

  const totalTasks =
    sections.urgentIncidents.length +
    sections.maintenanceActions.length +
    sections.preventiveOrders.length +
    sections.dueIdeas.length;

  return (
    <>
      <PageHeader
        title="Do zrobienia dziś"
        extra={
          <div className="flex items-center gap-3">
            <button
              onClick={() => void reload()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <Link
              to="/"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-slate-500">Łącznie działań operacyjnych</div>
        <div className="mt-2 text-3xl font-semibold text-slate-900">{totalTasks}</div>
        <div className="mt-1 text-xs text-slate-500">
          {selectedAssetId
            ? "Widok zawężony do jednej maszyny i jej działań operacyjnych."
            : "Priorytety z awarii, przeglądów, zleceń prewencyjnych i usprawnień."}
        </div>
        {selectedAssetId ? (
          <div className="mt-3">
            <Link
              to="/activity"
              className="text-xs font-medium text-sky-700 hover:underline"
            >
              Wyczyść filtr maszyny
            </Link>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error.message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow">
          Ładowanie działań...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <InboxSection
            title="Awarie wymagające reakcji"
            items={sections.urgentIncidents}
            emptyText="Brak krytycznych awarii lub aktywnych przestojów."
          />
          <InboxSection
            title="Przeglądy do wykonania"
            items={sections.maintenanceActions}
            emptyText="Brak przeglądów po terminie ani w progu alarmowym."
          />
          <InboxSection
            title="Zlecenia prewencyjne"
            items={sections.preventiveOrders}
            emptyText="Brak aktywnych zleceń wynikających z harmonogramu."
          />
          <InboxSection
            title="Kaizeny i usprawnienia"
            items={sections.dueIdeas}
            emptyText="Brak usprawnień z terminem wymagającym uwagi."
          />
        </div>
      )}
    </>
  );
}

function InboxSection({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: InboxItem[];
  emptyText: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          {items.length}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-100 px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">
                  {item.title}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {item.subtitle}
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  Termin / czas: {item.dueLabel}
                </div>
              </div>
              <OperationalStatusBadge label={item.badge} tone={item.tone} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={item.actionTo}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                Otwórz
              </Link>
              {item.secondaryTo && item.secondaryLabel ? (
                <Link
                  to={item.secondaryTo}
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {item.secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
            {emptyText}
          </div>
        ) : null}
      </div>
    </section>
  );
}
