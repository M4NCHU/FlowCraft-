import { type ReactNode, useEffect, useMemo, useState } from "react";
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

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";
type PanelMode = "day" | "preview" | "plans" | "meters";

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
    recurrenceUnitLabels[
      plan.recurrenceUnit ?? MaintenanceRecurrenceUnit.Month
    ];
  const unitLabelPlural =
    recurrenceUnitLabelsPlural[
      plan.recurrenceUnit ?? MaintenanceRecurrenceUnit.Month
    ];

  return `Co ${interval} ${interval === 1 ? unitLabel : unitLabelPlural}`;
}

function createOccurrenceFromPlan(
  plan: MaintenancePlanDto,
): MaintenanceCalendarOccurrenceDto | null {
  const scheduledForUtc = plan.nextDueAtUtc ?? new Date().toISOString();

  if (
    plan.triggerMode === MaintenanceTriggerMode.Calendar &&
    !plan.nextDueAtUtc
  ) {
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

function statusTone(status: MaintenanceOccurrenceStatus): Tone {
  switch (status) {
    case MaintenanceOccurrenceStatus.Completed:
      return "emerald";
    case MaintenanceOccurrenceStatus.DueSoon:
      return "amber";
    case MaintenanceOccurrenceStatus.Overdue:
      return "rose";
    case MaintenanceOccurrenceStatus.Upcoming:
      return "cyan";
    case MaintenanceOccurrenceStatus.Inactive:
    default:
      return "slate";
  }
}

export function MaintenancePlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDate = parseDateParam(searchParams.get("date")) ?? new Date();

  const [month, setMonth] = useState(() => startOfMonth(initialDate));
  const [selectedDay, setSelectedDay] = useState<Date>(initialDate);
  const [plans, setPlans] = useState<MaintenancePlanDto[]>([]);
  const [machines, setMachines] = useState<AssetListItemDto[]>([]);
  const [occurrences, setOccurrences] = useState<
    MaintenanceCalendarOccurrenceDto[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MaintenancePlanDto | null>(
    null,
  );
  const [completeOccurrence, setCompleteOccurrence] =
    useState<MaintenanceCalendarOccurrenceDto | null>(null);
  const [selectedOccurrence, setSelectedOccurrence] =
    useState<MaintenanceCalendarOccurrenceDto | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("day");

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
        (assetsData ?? []).filter((asset) => asset.type === AssetType.Machine),
      );
    } catch (err) {
      if (signal?.aborted) return;

      setError(
        toApiError(err, "Nie udało się pobrać harmonogramu przeglądów."),
      );
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
    setPanelMode("preview");
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
    setPanelMode("preview");
    setPlanModalOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("planId");
    setSearchParams(next, { replace: true });
  }, [plans, searchParams, setSearchParams]);

  const selectedMachine = machines.find(
    (machine) => machine.id === selectedAssetId,
  );

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((left, right) => {
        const leftMetric =
          left.triggerMode === MaintenanceTriggerMode.Calendar
            ? Date.parse(left.nextDueAtUtc ?? left.startsAtUtc)
            : (left.nextDueMeterValue ?? Number.MAX_SAFE_INTEGER);

        const rightMetric =
          right.triggerMode === MaintenanceTriggerMode.Calendar
            ? Date.parse(right.nextDueAtUtc ?? right.startsAtUtc)
            : (right.nextDueMeterValue ?? Number.MAX_SAFE_INTEGER);

        return (
          leftMetric - rightMetric ||
          left.title.localeCompare(right.title, "pl")
        );
      }),
    [plans],
  );

  const meterPlans = useMemo(
    () =>
      plans.filter((plan) => plan.triggerMode === MaintenanceTriggerMode.Meter),
    [plans],
  );

  const selectedDayOccurrences = useMemo(
    () =>
      occurrences.filter((occurrence) =>
        isSameDay(new Date(occurrence.scheduledForUtc), selectedDay),
      ),
    [occurrences, selectedDay],
  );

  const stats = useMemo(() => {
    const overdue = plans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.Overdue,
    ).length;

    const dueSoon = plans.filter(
      (plan) => plan.currentStatus === MaintenanceOccurrenceStatus.DueSoon,
    ).length;

    const recurring = plans.filter(
      (plan) => plan.scheduleType === MaintenanceScheduleType.Recurring,
    ).length;

    const completedThisMonth = occurrences.filter(
      (occurrence) =>
        occurrence.status === MaintenanceOccurrenceStatus.Completed &&
        new Date(occurrence.scheduledForUtc).getMonth() === month.getMonth() &&
        new Date(occurrence.scheduledForUtc).getFullYear() ===
          month.getFullYear(),
    ).length;

    return { overdue, dueSoon, recurring, completedThisMonth };
  }, [month, occurrences, plans]);

  const openCreateModal = (date?: Date) => {
    if (date) {
      setSelectedDay(date);
    }

    setSelectedOccurrence(null);
    setEditingPlan(null);
    setPanelMode("preview");
    setPlanModalOpen(true);
  };

  const openEditModal = (plan: MaintenancePlanDto) => {
    setSelectedOccurrence(null);
    setEditingPlan(plan);
    setSelectedDay(new Date(plan.nextDueAtUtc ?? plan.startsAtUtc));
    setPanelMode("preview");
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
        selectedAssetId || undefined,
      );

      setSyncMessage(
        result.createdWorkOrdersCount > 0
          ? `Utworzono ${result.createdWorkOrdersCount} nowych zleceń prewencyjnych.`
          : "Brak nowych zleceń do utworzenia.",
      );

      await loadData();
    } catch (err) {
      setError(toApiError(err, "Nie udało się zsynchronizować zleceń."));
    }
  };

  return (
    <>
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Prewencja
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {plans.length} aktywnych planów
                  </span>

                  {stats.overdue > 0 ? (
                    <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                      {stats.overdue} po terminie
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Przeglądy planowane
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Kalendarz przeglądów prewencyjnych, plany po liczniku oraz
                  szybkie akcje dla wybranego terminu. Priorytet mają zadania po
                  terminie i zbliżające się przeglądy.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:max-w-[46rem] xl:justify-end">
                <Link
                  to="/machines"
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Maszyny
                </Link>

                <Link
                  to={`/inventory${
                    selectedAssetId
                      ? `?assetId=${encodeURIComponent(selectedAssetId)}`
                      : ""
                  }`}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Magazyn
                </Link>

                <button
                  type="button"
                  onClick={() => void handleSync()}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Sync zleceń
                </button>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Odśwież
                </button>

                <button
                  type="button"
                  onClick={() => openCreateModal(selectedDay)}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Dodaj plan
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Aktywne plany"
                value={String(plans.length)}
                tone="cyan"
              />

              <StatCard
                label="Po terminie"
                value={String(stats.overdue)}
                tone={stats.overdue > 0 ? "rose" : "slate"}
              />

              <StatCard
                label="Wkrótce"
                value={String(stats.dueSoon)}
                tone={stats.dueSoon > 0 ? "amber" : "slate"}
              />

              <StatCard
                label="Wykonane w miesiącu"
                value={String(stats.completedThisMonth)}
                tone="emerald"
              />
            </div>
          </section>

          {syncMessage ? (
            <AlertBox tone="emerald">{syncMessage}</AlertBox>
          ) : null}

          {error ? <AlertBox tone="rose">{error.message}</AlertBox> : null}

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(390px,0.65fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                      {format(month, "LLLL yyyy", { locale: pl })}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Kalendarz pokazuje plany kalendarzowe. Plany po liczniku
                      są w zakładce „Liczniki”.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] xl:min-w-[36rem]">
                    <select
                      value={selectedAssetId}
                      onChange={(event) =>
                        updateAssetFilter(event.target.value)
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                    >
                      <option value="">Wszystkie maszyny</option>
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.name} ({machine.code})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() =>
                        setMonth((current) =>
                          startOfMonth(subMonths(current, 1)),
                        )
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                    >
                      Poprzedni
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setMonth((current) =>
                          startOfMonth(addMonths(current, 1)),
                        )
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                    >
                      Następny
                    </button>

                    <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(event) =>
                          setShowInactive(event.target.checked)
                        }
                      />
                      Nieaktywne
                    </label>
                  </div>
                </div>

                {selectedMachine ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm text-cyan-100">
                    <div>
                      Filtr maszyny:{" "}
                      <span className="font-semibold">
                        {selectedMachine.name} ({selectedMachine.code})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateAssetFilter("")}
                      className="rounded-lg border border-cyan-400/30 bg-slate-950/40 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/[0.12]"
                    >
                      Wyczyść filtr
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden p-3">
                {loading ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">
                    Ładowanie harmonogramu przeglądów...
                  </div>
                ) : (
                  <div className="h-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-2">
                    <MaintenanceCalendar
                      month={month}
                      occurrences={occurrences}
                      onSelectDay={(day) => {
                        setSelectedDay(day);
                        setSelectedOccurrence(null);
                        setPanelMode("day");
                      }}
                      onSelectOccurrence={(occurrence) => {
                        setSelectedDay(new Date(occurrence.scheduledForUtc));
                        setSelectedOccurrence(occurrence);
                        setPanelMode("preview");
                      }}
                    />
                  </div>
                )}
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                  <PanelTab
                    active={panelMode === "day"}
                    onClick={() => setPanelMode("day")}
                  >
                    Dzień
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "preview"}
                    onClick={() => setPanelMode("preview")}
                  >
                    Podgląd
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "plans"}
                    onClick={() => setPanelMode("plans")}
                  >
                    Plany
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "meters"}
                    onClick={() => setPanelMode("meters")}
                  >
                    Liczniki
                  </PanelTab>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {panelMode === "day" ? (
                  <DayPanel
                    selectedDay={selectedDay}
                    occurrences={selectedDayOccurrences}
                    onCreate={() => openCreateModal(selectedDay)}
                    onSelectOccurrence={(occurrence) => {
                      setSelectedOccurrence(occurrence);
                      setPanelMode("preview");
                    }}
                  />
                ) : null}

                {panelMode === "preview" ? (
                  <PreviewPanel
                    selectedMachine={selectedMachine}
                    selectedOccurrence={selectedOccurrence}
                    plans={plans}
                    onEditPlan={openEditModal}
                    onComplete={setCompleteOccurrence}
                  />
                ) : null}

                {panelMode === "plans" ? (
                  <PlansPanel
                    plans={sortedPlans}
                    stats={stats}
                    selectedAssetId={selectedAssetId}
                    onClearAssetFilter={() => updateAssetFilter("")}
                    onEditPlan={openEditModal}
                    onComplete={setCompleteOccurrence}
                  />
                ) : null}

                {panelMode === "meters" ? (
                  <MeterPlansPanel
                    meterPlans={meterPlans}
                    onEditPlan={openEditModal}
                    onComplete={setCompleteOccurrence}
                  />
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>

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

function DayPanel({
  selectedDay,
  occurrences,
  onCreate,
  onSelectOccurrence,
}: {
  selectedDay: Date;
  occurrences: MaintenanceCalendarOccurrenceDto[];
  onCreate: () => void;
  onSelectOccurrence: (occurrence: MaintenanceCalendarOccurrenceDto) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <PanelHeader
        title={format(selectedDay, "dd MMMM yyyy", { locale: pl })}
        description={`${occurrences.length} pozycji w kalendarzu`}
        action={
          <button
            type="button"
            onClick={onCreate}
            className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
          >
            Dodaj od tego dnia
          </button>
        }
      />

      <div className="mt-3 space-y-2">
        {occurrences.map((occurrence) => (
          <button
            key={`${occurrence.planId}-${occurrence.scheduledForUtc}`}
            type="button"
            onClick={() => onSelectOccurrence(occurrence)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-left transition hover:border-cyan-400/25 hover:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="line-clamp-1 text-sm font-semibold text-white">
                  {occurrence.planTitle}
                </div>
                <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {occurrence.assetName} ({occurrence.assetCode})
                </div>
              </div>

              <StatusBadge status={occurrence.status} />
            </div>

            <div className="mt-2 text-xs text-slate-500">
              {formatDateTime(occurrence.scheduledForUtc)}
            </div>
          </button>
        ))}

        {occurrences.length === 0 ? (
          <EmptyBox text="Brak przeglądów w wybranym dniu." />
        ) : null}
      </div>
    </div>
  );
}

function PreviewPanel({
  selectedMachine,
  selectedOccurrence,
  plans,
  onEditPlan,
  onComplete,
}: {
  selectedMachine?: AssetListItemDto;
  selectedOccurrence: MaintenanceCalendarOccurrenceDto | null;
  plans: MaintenancePlanDto[];
  onEditPlan: (plan: MaintenancePlanDto) => void;
  onComplete: (occurrence: MaintenanceCalendarOccurrenceDto) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <PanelHeader
        title="Akcje i podgląd"
        description={
          selectedMachine
            ? `Filtr aktywny: ${selectedMachine.name} (${selectedMachine.code})`
            : "Brak filtra maszyny. Możesz wyświetlić cały kalendarz albo zawęzić go do jednej maszyny."
        }
      />

      {selectedOccurrence ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={selectedOccurrence.status} />

              <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-xs text-slate-300">
                {selectedOccurrence.triggerMode ===
                MaintenanceTriggerMode.Calendar
                  ? "Kalendarz"
                  : "Licznik"}
              </span>
            </div>

            <div className="mt-3 text-lg font-bold leading-tight text-white">
              {selectedOccurrence.planTitle}
            </div>

            <div className="mt-1 text-sm text-slate-400">
              {selectedOccurrence.assetName} ({selectedOccurrence.assetCode})
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <DetailTile
                label="Termin"
                value={formatDateTime(selectedOccurrence.scheduledForUtc)}
                tone="cyan"
              />

              <DetailTile
                label="Czas"
                value={`${selectedOccurrence.estimatedDurationMinutes ?? "-"} min`}
              />

              <DetailTile
                label="Wyprzedzenie"
                value={`${selectedOccurrence.leadTimeDays ?? 0} dni`}
              />

              <DetailTile
                label="Zlecenie"
                value={selectedOccurrence.openWorkOrderId ? "Tak" : "Nie"}
                tone={selectedOccurrence.openWorkOrderId ? "emerald" : "slate"}
              />
            </div>

            {selectedOccurrence.notes ? (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm leading-6 text-slate-400">
                {selectedOccurrence.notes}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Link
              to={`/machines/${selectedOccurrence.assetId}`}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Szczegóły maszyny
            </Link>

            {selectedOccurrence.openWorkOrderId ? (
              <Link
                to={`/work-orders/${selectedOccurrence.openWorkOrderId}`}
                className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-center text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
              >
                Otwórz zlecenie
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => {
                const plan = plans.find(
                  (entry) => entry.id === selectedOccurrence.planId,
                );

                if (plan) {
                  onEditPlan(plan);
                }
              }}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Edytuj plan
            </button>

            {selectedOccurrence.status !==
            MaintenanceOccurrenceStatus.Completed ? (
              <button
                type="button"
                onClick={() => onComplete(selectedOccurrence)}
                className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
              >
                Oznacz wykonanie
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <EmptyBox text="Wybierz termin z kalendarza, aby otworzyć szybkie akcje i podgląd planu." />
        </div>
      )}
    </div>
  );
}

function PlansPanel({
  plans,
  stats,
  selectedAssetId,
  onClearAssetFilter,
  onEditPlan,
  onComplete,
}: {
  plans: MaintenancePlanDto[];
  stats: {
    overdue: number;
    dueSoon: number;
    recurring: number;
    completedThisMonth: number;
  };
  selectedAssetId: string;
  onClearAssetFilter: () => void;
  onEditPlan: (plan: MaintenancePlanDto) => void;
  onComplete: (occurrence: MaintenanceCalendarOccurrenceDto) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <PanelHeader
        title="Lista planów"
        description={`${stats.recurring} cyklicznych, ${plans.length - stats.recurring} jednorazowych`}
        action={
          selectedAssetId ? (
            <button
              type="button"
              onClick={onClearAssetFilter}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Wyczyść filtr
            </button>
          ) : null
        }
      />

      <div className="mt-3 space-y-2">
        {plans.map((plan) => {
          const nextOccurrence = createOccurrenceFromPlan(plan);

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              nextOccurrence={nextOccurrence}
              onEdit={() => onEditPlan(plan)}
              onComplete={onComplete}
            />
          );
        })}

        {plans.length === 0 ? (
          <EmptyBox text="Brak planów dla bieżącego zakresu. Dodaj pierwszy plan przeglądu albo wybierz inną maszynę." />
        ) : null}
      </div>
    </div>
  );
}

function MeterPlansPanel({
  meterPlans,
  onEditPlan,
  onComplete,
}: {
  meterPlans: MaintenancePlanDto[];
  onEditPlan: (plan: MaintenancePlanDto) => void;
  onComplete: (occurrence: MaintenanceCalendarOccurrenceDto) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <PanelHeader
        title="Plany po liczniku"
        description={
          meterPlans.length > 0
            ? `${meterPlans.length} planów korzysta z odczytów liczników eksploatacyjnych.`
            : "Brak planów wykorzystujących liczniki eksploatacyjne."
        }
      />

      <div className="mt-3 space-y-2">
        {meterPlans.map((plan) => {
          const nextOccurrence = createOccurrenceFromPlan(plan);

          return (
            <PlanCard
              key={plan.id}
              plan={plan}
              nextOccurrence={nextOccurrence}
              onEdit={() => onEditPlan(plan)}
              onComplete={onComplete}
            />
          );
        })}

        {meterPlans.length === 0 ? (
          <EmptyBox text="Brak planów po liczniku. Dodaj plan z trybem licznika, jeśli przegląd zależy od godzin pracy, cykli albo partii." />
        ) : null}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  nextOccurrence,
  onEdit,
  onComplete,
}: {
  plan: MaintenancePlanDto;
  nextOccurrence: MaintenanceCalendarOccurrenceDto | null;
  onEdit: () => void;
  onComplete: (occurrence: MaintenanceCalendarOccurrenceDto) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-semibold text-white">
            {plan.title}
          </div>

          <div className="mt-1 line-clamp-1 text-xs text-slate-500">
            {plan.assetName} ({plan.assetCode})
          </div>
        </div>

        <StatusBadge status={plan.currentStatus} />
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <SmallInfo label="Harmonogram" value={formatSchedule(plan)} />

        <SmallInfo
          label="Tryb"
          value={
            plan.triggerMode === MaintenanceTriggerMode.Calendar
              ? "Kalendarz"
              : "Licznik"
          }
        />

        <SmallInfo
          label="Termin / próg"
          value={
            plan.triggerMode === MaintenanceTriggerMode.Calendar
              ? formatDateTime(plan.nextDueAtUtc)
              : String(plan.nextDueMeterValue ?? "-")
          }
        />

        <SmallInfo
          label="Zlecenie"
          value={plan.openWorkOrderId ? "Tak" : "Nie"}
        />
      </div>

      {plan.checklist ? (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-xs text-slate-400">
          <div className="mb-1 font-semibold text-slate-200">Checklista</div>
          <div className="line-clamp-3 whitespace-pre-wrap">
            {plan.checklist}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={`/machines/${plan.assetId}`}
          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Maszyna
        </Link>

        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
        >
          Edytuj
        </button>

        {plan.openWorkOrderId ? (
          <Link
            to={`/work-orders/${plan.openWorkOrderId}`}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Zlecenie
          </Link>
        ) : null}

        {nextOccurrence ? (
          <button
            type="button"
            onClick={() => onComplete(nextOccurrence)}
            className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.10] px-2.5 py-1.5 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.14]"
          >
            Wykonaj
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
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
    </div>
  );
}

function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      {action}
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

function StatusBadge({ status }: { status: MaintenanceOccurrenceStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
        statusTone(status),
      )}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function DetailTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>

      <div className="mt-1 line-clamp-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 line-clamp-2 text-xs font-semibold text-slate-200">
        {value}
      </div>
    </div>
  );
}

function AlertBox({
  tone,
  children,
}: {
  tone: "emerald" | "rose";
  children: ReactNode;
}) {
  const className =
    tone === "emerald"
      ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100"
      : "border-rose-400/25 bg-rose-400/[0.08] text-rose-100";

  return (
    <div
      className={`shrink-0 rounded-2xl border px-4 py-2 text-sm ${className}`}
    >
      {children}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-3 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}
