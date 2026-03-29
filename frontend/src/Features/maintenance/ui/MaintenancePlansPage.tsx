import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { pl } from "date-fns/locale";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { assetsApi } from "../../machines/api/assetsApi";
import { AssetType, type AssetListItemDto } from "../../machines/api/contracts";
import { maintenancePlansApi } from "../api/maintenancePlansApi";
import {
  MaintenanceOccurrenceStatus,
  MaintenanceRecurrenceUnit,
  MaintenanceScheduleType,
  MaintenanceTriggerMode,
  type MaintenanceCalendarOccurrenceDto,
  type MaintenancePlanDto,
} from "../api/contracts";
import { CompleteMaintenanceModal } from "./components/CompleteMaintenanceModal";
import { MaintenanceCalendar } from "./components/MaintenanceCalendar";
import { MaintenancePlanModal } from "./components/MaintenancePlanModal";

const statusLabels: Record<MaintenanceOccurrenceStatus, string> = {
  [MaintenanceOccurrenceStatus.Upcoming]: "Zaplanowany",
  [MaintenanceOccurrenceStatus.DueSoon]: "Wkrótce",
  [MaintenanceOccurrenceStatus.Overdue]: "Po terminie",
  [MaintenanceOccurrenceStatus.Completed]: "Wykonany",
  [MaintenanceOccurrenceStatus.Inactive]: "Nieaktywny",
};

const statusClasses: Record<MaintenanceOccurrenceStatus, string> = {
  [MaintenanceOccurrenceStatus.Upcoming]:
    "border-slate-200 bg-slate-50 text-slate-700",
  [MaintenanceOccurrenceStatus.DueSoon]:
    "border-amber-200 bg-amber-50 text-amber-800",
  [MaintenanceOccurrenceStatus.Overdue]:
    "border-rose-200 bg-rose-50 text-rose-700",
  [MaintenanceOccurrenceStatus.Completed]:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  [MaintenanceOccurrenceStatus.Inactive]:
    "border-slate-200 bg-slate-100 text-slate-500",
};

const recurrenceUnitLabels: Record<MaintenanceRecurrenceUnit, string> = {
  [MaintenanceRecurrenceUnit.Day]: "dzień",
  [MaintenanceRecurrenceUnit.Week]: "tydzień",
  [MaintenanceRecurrenceUnit.Month]: "miesiąc",
  [MaintenanceRecurrenceUnit.Quarter]: "kwartał",
  [MaintenanceRecurrenceUnit.Year]: "rok",
};

const recurrenceUnitLabelsPlural: Record<MaintenanceRecurrenceUnit, string> = {
  [MaintenanceRecurrenceUnit.Day]: "dni",
  [MaintenanceRecurrenceUnit.Week]: "tygodnie",
  [MaintenanceRecurrenceUnit.Month]: "miesiące",
  [MaintenanceRecurrenceUnit.Quarter]: "kwartały",
  [MaintenanceRecurrenceUnit.Year]: "lata",
};

function parseDateParam(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Brak terminu";
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSchedule(plan: MaintenancePlanDto) {
  if (plan.triggerMode === MaintenanceTriggerMode.Meter) {
    if (plan.scheduleType === MaintenanceScheduleType.OneTime) {
      return `Jednorazowo przy liczniku ${plan.nextDueMeterValue ?? "-"}`;
    }

    const interval = plan.meterInterval ?? 0;
    return `Co ${interval} jednostek licznika`;
  }

  if (plan.scheduleType === MaintenanceScheduleType.OneTime) {
    return `Jednorazowo: ${formatDateTime(plan.startsAtUtc)}`;
  }

  const interval = plan.recurrenceInterval ?? 1;
  const unitLabel =
    recurrenceUnitLabels[plan.recurrenceUnit ?? MaintenanceRecurrenceUnit.Month];
  const unitLabelPlural =
    recurrenceUnitLabelsPlural[
      plan.recurrenceUnit ?? MaintenanceRecurrenceUnit.Month
    ];

  return `Co ${interval} ${interval === 1 ? unitLabel : unitLabelPlural}`;
}

function createOccurrenceFromPlan(
  plan: MaintenancePlanDto
): MaintenanceCalendarOccurrenceDto | null {
  const scheduledForUtc = plan.nextDueAtUtc ?? new Date().toISOString();

  if (plan.triggerMode === MaintenanceTriggerMode.Calendar && !plan.nextDueAtUtc) {
    return null;
  }

  return {
    planId: plan.id,
    assetId: plan.assetId,
    assetName: plan.assetName,
    assetCode: plan.assetCode,
    planTitle: plan.title,
    scheduledForUtc,
    scheduledMeterValue: plan.nextDueMeterValue ?? null,
    completedAtUtc: null,
    status: plan.currentStatus,
    triggerMode: plan.triggerMode,
    leadTimeDays: plan.leadTimeDays,
    estimatedDurationMinutes: plan.estimatedDurationMinutes,
    openWorkOrderId: plan.openWorkOrderId ?? null,
    notes: plan.description ?? null,
  };
}

export function MaintenancePlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = parseDateParam(searchParams.get("date")) ?? new Date();
  const [month, setMonth] = useState(() => startOfMonth(initialDate));
  const [selectedDay, setSelectedDay] = useState<Date>(initialDate);
  const [plans, setPlans] = useState<MaintenancePlanDto[]>([]);
  const [machines, setMachines] = useState<AssetListItemDto[]>([]);
  const [occurrences, setOccurrences] = useState<MaintenanceCalendarOccurrenceDto[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlanDto | null>(null);
  const [completeOccurrence, setCompleteOccurrence] =
    useState<MaintenanceCalendarOccurrenceDto | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] =
    useState<MaintenanceCalendarOccurrenceDto | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const selectedAssetId = searchParams.get("assetId") ?? "";

  const loadData = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const [plansData, calendarData, assetsData] = await Promise.all([
        maintenancePlansApi.list({
          assetId: selectedAssetId || undefined,
          includeInactive: showInactive,
          signal,
        }),
        maintenancePlansApi.getCalendar({
          fromUtc: startOfMonth(month).toISOString(),
          toUtc: endOfMonth(month).toISOString(),
          assetId: selectedAssetId || undefined,
          signal,
        }),
        assetsApi.list({ signal }),
      ]);

      setPlans(plansData ?? []);
      setOccurrences(calendarData ?? []);
      setMachines(
        (assetsData ?? []).filter((asset) => asset.type === AssetType.Machine)
      );
    } catch (err) {
      if (signal?.aborted) return;
      setError(toApiError(err, "Nie udało się pobrać harmonogramu przeglądów."));
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
  }, [month, selectedAssetId, showInactive]);

  useEffect(() => {
    const shouldCreate = searchParams.get("create") === "1";
    if (!shouldCreate) return;

    const prefilledDate = parseDateParam(searchParams.get("date"));
    if (prefilledDate) {
      setSelectedDay(prefilledDate);
      setMonth(startOfMonth(prefilledDate));
    }

    setEditingPlan(null);
    setSelectedOccurrence(null);
    setPlanModalOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("create");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const planId = searchParams.get("planId");
    if (!planId || plans.length === 0) return;

    const plan = plans.find((entry) => entry.id === planId);
    if (!plan) return;

    setEditingPlan(plan);
    setSelectedOccurrence(null);
    setSelectedDay(new Date(plan.nextDueAtUtc ?? plan.startsAtUtc));
    setPlanModalOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("planId");
    setSearchParams(next, { replace: true });
  }, [plans, searchParams, setSearchParams]);

  const selectedMachine = machines.find((machine) => machine.id === selectedAssetId);

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((left, right) => {
        const leftMetric =
          left.triggerMode === MaintenanceTriggerMode.Calendar
            ? Date.parse(left.nextDueAtUtc ?? left.startsAtUtc)
            : left.nextDueMeterValue ?? Number.MAX_SAFE_INTEGER;
        const rightMetric =
          right.triggerMode === MaintenanceTriggerMode.Calendar
            ? Date.parse(right.nextDueAtUtc ?? right.startsAtUtc)
            : right.nextDueMeterValue ?? Number.MAX_SAFE_INTEGER;
        return leftMetric - rightMetric || left.title.localeCompare(right.title, "pl");
      }),
    [plans]
  );

  const meterPlans = useMemo(
    () => plans.filter((plan) => plan.triggerMode === MaintenanceTriggerMode.Meter),
    [plans]
  );

  const selectedDayOccurrences = useMemo(
    () =>
      occurrences.filter((occurrence) =>
        isSameDay(new Date(occurrence.scheduledForUtc), selectedDay)
      ),
    [occurrences, selectedDay]
  );

  const stats = useMemo(() => {
    const overdue = plans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.Overdue
    ).length;
    const dueSoon = plans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon
    ).length;
    const recurring = plans.filter(
      (plan) => plan.scheduleType === MaintenanceScheduleType.Recurring
    ).length;
    const completedThisMonth = occurrences.filter(
      (occurrence) =>
        occurrence.status === MaintenanceOccurrenceStatus.Completed &&
        new Date(occurrence.scheduledForUtc).getMonth() === month.getMonth() &&
        new Date(occurrence.scheduledForUtc).getFullYear() ===
          month.getFullYear()
    ).length;

    return { overdue, dueSoon, recurring, completedThisMonth };
  }, [month, occurrences, plans]);

  const openCreateModal = (date?: Date) => {
    if (date) {
      setSelectedDay(date);
    }
    setSelectedOccurrence(null);
    setEditingPlan(null);
    setPlanModalOpen(true);
  };

  const openEditModal = (plan: MaintenancePlanDto) => {
    setSelectedOccurrence(null);
    setEditingPlan(plan);
    setSelectedDay(new Date(plan.nextDueAtUtc ?? plan.startsAtUtc));
    setPlanModalOpen(true);
  };

  const updateAssetFilter = (assetId: string) => {
    const next = new URLSearchParams(searchParams);

    if (assetId) {
      next.set("assetId", assetId);
    } else {
      next.delete("assetId");
    }

    setSearchParams(next, { replace: true });
  };

  const handleSync = async () => {
    try {
      const result = await maintenancePlansApi.syncAutoWorkOrders(
        selectedAssetId || undefined
      );
      setSyncMessage(
        result.createdWorkOrdersCount > 0
          ? `Utworzono ${result.createdWorkOrdersCount} nowych zleceń prewencyjnych.`
          : "Brak nowych zleceń do utworzenia."
      );
      await loadData();
    } catch (err) {
      setError(toApiError(err, "Nie udało się zsynchronizować zleceń."));
    }
  };

  return (
    <>
      <PageHeader
        title="Przeglądy planowane"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/machines"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Maszyny
            </Link>
            <button
              onClick={() => void handleSync()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Sync zleceń
            </button>
            <button
              onClick={() => void loadData()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <button
              onClick={() => openCreateModal(selectedDay)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj plan
            </button>
          </div>
        }
      />

      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Aktywne plany" value={String(plans.length)} />
            <StatCard
              label="Po terminie"
              value={String(stats.overdue)}
              tone={stats.overdue > 0 ? "danger" : "neutral"}
            />
            <StatCard
              label="Wkrótce"
              value={String(stats.dueSoon)}
              tone={stats.dueSoon > 0 ? "warning" : "neutral"}
            />
            <StatCard
              label="Wykonane w miesiącu"
              value={String(stats.completedThisMonth)}
              tone="success"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Maszyna</span>
              <select
                value={selectedAssetId}
                onChange={(event) => updateAssetFilter(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Wszystkie maszyny</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} ({machine.code})
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() => setMonth((current) => startOfMonth(subMonths(current, 1)))}
              className="self-end rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Poprzedni
            </button>

            <button
              onClick={() => setMonth((current) => startOfMonth(addMonths(current, 1)))}
              className="self-end rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Następny
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <div className="text-lg font-semibold text-slate-900">
              {format(month, "LLLL yyyy", { locale: pl })}
            </div>
            <div className="text-sm text-slate-500">
              Plany kalendarzowe są widoczne na siatce dni, a plany po liczniku
              w osobnej sekcji poniżej.
            </div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(event) => setShowInactive(event.target.checked)}
            />
            Pokaż nieaktywne plany
          </label>
        </div>
      </div>

      {syncMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {syncMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error.message}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow">
          Ładowanie harmonogramu przeglądów...
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.65fr_0.95fr]">
            <MaintenanceCalendar
              month={month}
              occurrences={occurrences}
              onSelectDay={(day) => {
                setSelectedDay(day);
                setSelectedOccurrence(null);
              }}
              onSelectOccurrence={(occurrence) => {
                setSelectedDay(new Date(occurrence.scheduledForUtc));
                setSelectedOccurrence(occurrence);
              }}
            />

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {format(selectedDay, "dd MMMM yyyy", { locale: pl })}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedDayOccurrences.length} pozycji w kalendarzu
                    </div>
                  </div>
                  <button
                    onClick={() => openCreateModal(selectedDay)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Dodaj plan od tego dnia
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {selectedDayOccurrences.map((occurrence) => (
                    <button
                      key={`${occurrence.planId}-${occurrence.scheduledForUtc}`}
                      type="button"
                      onClick={() => setSelectedOccurrence(occurrence)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {occurrence.planTitle}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {occurrence.assetName} ({occurrence.assetCode})
                          </div>
                        </div>
                        <span
                          className={[
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            statusClasses[occurrence.status],
                          ].join(" ")}
                        >
                          {statusLabels[occurrence.status]}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {formatDateTime(occurrence.scheduledForUtc)}
                      </div>
                    </button>
                  ))}

                  {selectedDayOccurrences.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-sm text-slate-500">
                      Brak przeglądów w wybranym dniu.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">
                  Akcje i podgląd
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {selectedMachine
                    ? `Filtr aktywny: ${selectedMachine.name} (${selectedMachine.code})`
                    : "Brak filtra maszyny. Możesz wyświetlić cały kalendarz lub zawęzić go do jednej maszyny."}
                </div>

                {selectedOccurrence ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {selectedOccurrence.planTitle}
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedOccurrence.assetName} ({selectedOccurrence.assetCode})
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Termin: {formatDateTime(selectedOccurrence.scheduledForUtc)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/machines/${selectedOccurrence.assetId}`}
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Szczegóły maszyny
                      </Link>
                      {selectedOccurrence.openWorkOrderId ? (
                        <Link
                          to={`/work-orders/${selectedOccurrence.openWorkOrderId}`}
                          className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Zlecenie
                        </Link>
                      ) : null}
                      <button
                        onClick={() => {
                          const plan = plans.find(
                            (entry) => entry.id === selectedOccurrence.planId
                          );
                          if (plan) {
                            openEditModal(plan);
                          }
                        }}
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edytuj plan
                      </button>
                      {selectedOccurrence.status !==
                      MaintenanceOccurrenceStatus.Completed ? (
                        <button
                          onClick={() => setCompleteOccurrence(selectedOccurrence)}
                          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          Oznacz wykonanie
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-3 py-5 text-sm text-slate-500">
                    Wybierz termin z kalendarza, aby otworzyć szybkie akcje i
                    podgląd planu.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-900">
                  Lista planów
                </div>
                <div className="text-sm text-slate-500">
                  {stats.recurring} planów cyklicznych, {plans.length - stats.recurring}{" "}
                  jednorazowych.
                </div>
              </div>
              {selectedAssetId ? (
                <button
                  onClick={() => updateAssetFilter("")}
                  className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Wyczyść filtr
                </button>
              ) : null}
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">
                Plany po liczniku
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {meterPlans.length > 0
                  ? `${meterPlans.length} planów korzysta z odczytów liczników eksploatacyjnych.`
                  : "Brak planów wykorzystujących liczniki eksploatacyjne."}
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {sortedPlans.map((plan) => {
                const nextOccurrence = createOccurrenceFromPlan(plan);

                return (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {plan.title}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {plan.assetName} ({plan.assetCode})
                        </div>
                      </div>
                      <span
                        className={[
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          statusClasses[plan.currentStatus],
                        ].join(" ")}
                      >
                        {statusLabels[plan.currentStatus]}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <div>
                        <div className="uppercase tracking-wide text-slate-400">
                          Harmonogram
                        </div>
                        <div>{formatSchedule(plan)}</div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wide text-slate-400">
                          Tryb
                        </div>
                        <div>
                          {plan.triggerMode === MaintenanceTriggerMode.Calendar
                            ? "Kalendarz"
                            : "Licznik"}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wide text-slate-400">
                          Następny termin / próg
                        </div>
                        <div>
                          {plan.triggerMode === MaintenanceTriggerMode.Calendar
                            ? formatDateTime(plan.nextDueAtUtc)
                            : plan.nextDueMeterValue ?? "-"}
                        </div>
                      </div>
                      <div>
                        <div className="uppercase tracking-wide text-slate-400">
                          Zlecenie prewencyjne
                        </div>
                        <div>{plan.openWorkOrderId ? "Tak" : "Nie"}</div>
                      </div>
                    </div>

                    {plan.checklist ? (
                      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                        <div className="mb-1 font-medium text-slate-800">Checklista</div>
                        <div className="line-clamp-3 whitespace-pre-wrap">
                          {plan.checklist}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to={`/machines/${plan.assetId}`}
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Szczegóły maszyny
                      </Link>
                      <button
                        onClick={() => openEditModal(plan)}
                        className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edytuj
                      </button>
                      {plan.openWorkOrderId ? (
                        <Link
                          to={`/work-orders/${plan.openWorkOrderId}`}
                          className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Zlecenie
                        </Link>
                      ) : null}
                      {nextOccurrence ? (
                        <button
                          onClick={() => setCompleteOccurrence(nextOccurrence)}
                          className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          Oznacz wykonanie
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {sortedPlans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 lg:col-span-2">
                  Brak planów dla bieżącego zakresu. Dodaj pierwszy plan przeglądu
                  albo wybierz inną maszynę.
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      <MaintenancePlanModal
        open={planModalOpen}
        machines={machines}
        initialPlan={editingPlan}
        preselectedAssetId={
          (editingPlan?.assetId ?? selectedAssetId) || undefined
        }
        initialStartsAt={selectedDay}
        onClose={() => {
          setPlanModalOpen(false);
          setEditingPlan(null);
        }}
        onSaved={async () => {
          await loadData();
        }}
      />

      <CompleteMaintenanceModal
        open={!!completeOccurrence}
        occurrence={completeOccurrence}
        onClose={() => setCompleteOccurrence(null)}
        onSaved={async () => {
          await loadData();
          setSelectedOccurrence(null);
        }}
      />
    </>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger" | "success";
};

function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  const toneClasses =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50";

  return (
    <div className={["rounded-xl border px-4 py-3", toneClasses].join(" ")}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}