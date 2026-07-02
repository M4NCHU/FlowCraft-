import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { departmentsApi } from "../../departments/api/departmentsApi";
import type { DepartmentDto } from "../../departments/api/contracts";
import { employeesApi } from "../../employees/api/employeesApi";
import type { EmployeeDto } from "../../employees/api/contracts";
import { improvementIdeasApi } from "../api/improvementIdeasApi";
import {
  ImprovementImpact,
  ImprovementStatus,
  type ImprovementIdeaDto,
} from "../api/contracts";
import { AddImprovementIdeaModal } from "./components/AddImprovementIdeaModal";

const statusLabels: Record<ImprovementStatus, string> = {
  [ImprovementStatus.New]: "Nowe",
  [ImprovementStatus.InReview]: "W analizie",
  [ImprovementStatus.Approved]: "Zaakceptowane",
  [ImprovementStatus.InProgress]: "W realizacji",
  [ImprovementStatus.Implemented]: "Wdrożone",
  [ImprovementStatus.Rejected]: "Odrzucone",
};

const impactLabels: Record<ImprovementImpact, string> = {
  [ImprovementImpact.Low]: "Niski",
  [ImprovementImpact.Medium]: "Średni",
  [ImprovementImpact.High]: "Wysoki",
  [ImprovementImpact.Critical]: "Krytyczny",
};

const wasteLabels: Record<number, string> = {
  1: "Transport",
  2: "Zapasy",
  3: "Ruch",
  4: "Oczekiwanie",
  5: "Nadprodukcja",
  6: "Nadmierne przetwarzanie",
  7: "Braki jakościowe",
  8: "Niewykorzystany potencjał",
};

const activeStatuses = [
  ImprovementStatus.New,
  ImprovementStatus.InReview,
  ImprovementStatus.Approved,
  ImprovementStatus.InProgress,
] as const;

type SidePanelMode = "decision" | "board" | "insights";

type MetricTone = "slate" | "emerald" | "sky" | "rose" | "cyan" | "violet";
type AlertTone = "slate" | "emerald" | "amber" | "rose" | "cyan";
type SmallMetricTone =
  | "slate"
  | "emerald"
  | "amber"
  | "rose"
  | "cyan"
  | "violet";

type InsightsData = {
  activeIdeas: ImprovementIdeaDto[];
  quickWins: ImprovementIdeaDto[];
  overdueIdeas: ImprovementIdeaDto[];
  dueSoonIdeas: ImprovementIdeaDto[];
  implemented: ImprovementIdeaDto[];
  savingsPotential: number;
  realizedSavings: number;
  avgImprovement: number | null;
  avgTargetAchievement: number | null;
  recommendedIdeas: ImprovementIdeaDto[];
  wasteHotspots: {
    wasteType: number;
    count: number;
  }[];
  implementedHighlights: ImprovementIdeaDto[];
};

export function LeanIdeasScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ideas, setIdeas] = useState<ImprovementIdeaDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingIdea, setEditingIdea] = useState<ImprovementIdeaDto | null>(
    null,
  );
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [updatingIdeaId, setUpdatingIdeaId] = useState<string | null>(null);
  const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>("decision");
  const createFromQuery = searchParams.get("create") === "1";

  const loadData = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      improvementIdeasApi.list({ includeClosed: true, signal }),
      departmentsApi.list({ includeInactive: false, signal }),
      employeesApi.list({ includeInactive: false, signal }),
    ]);

    if (signal?.aborted) return;

    const [ideasResult, departmentsResult, employeesResult] = results;
    const firstRejected = results.find(
      (result) => result.status === "rejected",
    );

    const nextIdeas =
      ideasResult.status === "fulfilled" ? (ideasResult.value ?? []) : [];

    setIdeas(nextIdeas);
    setDepartments(
      departmentsResult.status === "fulfilled"
        ? (departmentsResult.value ?? [])
        : [],
    );
    setEmployees(
      employeesResult.status === "fulfilled"
        ? (employeesResult.value ?? [])
        : [],
    );
    setSelectedIdeaId((current) => current ?? nextIdeas[0]?.id ?? null);
    setLoading(false);
    setError(
      firstRejected
        ? toApiError(
            firstRejected.reason,
            "Nie udało się załadować tablicy usprawnień.",
          )
        : null,
    );
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (createFromQuery && !editingIdea) {
      setOpenAdd(true);
    }
  }, [createFromQuery, editingIdea]);

  const insights = useMemo<InsightsData>(() => {
    const activeIdeas = ideas.filter(
      (idea) =>
        idea.status !== ImprovementStatus.Implemented &&
        idea.status !== ImprovementStatus.Rejected,
    );

    const quickWins = activeIdeas.filter((idea) => idea.quickWin);
    const overdueIdeas = activeIdeas.filter((idea) => idea.isOverdue);
    const dueSoonIdeas = activeIdeas.filter(
      (idea) => !idea.isOverdue && idea.isDueSoon,
    );

    const implemented = ideas.filter(
      (idea) => idea.status === ImprovementStatus.Implemented,
    );

    const savingsPotential = activeIdeas.reduce(
      (sum, idea) => sum + (idea.estimatedSavingsPerMonth ?? 0),
      0,
    );

    const realizedSavings = implemented.reduce(
      (sum, idea) => sum + (idea.implementedSavingsPerMonth ?? 0),
      0,
    );

    const measuredImplemented = implemented.filter(
      (idea) => idea.actualValue != null && idea.improvementPercent != null,
    );

    const avgImprovement = measuredImplemented.length
      ? measuredImplemented.reduce(
          (sum, idea) => sum + (idea.improvementPercent ?? 0),
          0,
        ) / measuredImplemented.length
      : null;

    const avgTargetAchievement = measuredImplemented.length
      ? measuredImplemented.reduce(
          (sum, idea) => sum + (idea.targetAchievementPercent ?? 0),
          0,
        ) / measuredImplemented.length
      : null;

    const recommendedIdeas = activeIdeas
      .slice()
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) {
          return b.priorityScore - a.priorityScore;
        }

        return Date.parse(a.createdAtUtc) - Date.parse(b.createdAtUtc);
      })
      .slice(0, 4);

    const wasteHotspots = Object.entries(
      activeIdeas.reduce<Record<string, number>>((acc, idea) => {
        const key = String(idea.wasteType);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([wasteType, count]) => ({
        wasteType: Number(wasteType),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    const implementedHighlights = implemented
      .filter((idea) => idea.actualValue != null || idea.resultSummary)
      .slice()
      .sort((a, b) => Date.parse(b.updatedAtUtc) - Date.parse(a.updatedAtUtc))
      .slice(0, 4);

    return {
      activeIdeas,
      quickWins,
      overdueIdeas,
      dueSoonIdeas,
      implemented,
      savingsPotential,
      realizedSavings,
      avgImprovement,
      avgTargetAchievement,
      recommendedIdeas,
      wasteHotspots,
      implementedHighlights,
    };
  }, [ideas]);

  const boardColumns = useMemo(
    () =>
      activeStatuses.map((status) => ({
        status,
        ideas: ideas
          .filter((idea) => idea.status === status)
          .sort((a, b) => b.priorityScore - a.priorityScore),
      })),
    [ideas],
  );

  const selectedIdea = useMemo(
    () => ideas.find((idea) => idea.id === selectedIdeaId) ?? null,
    [ideas, selectedIdeaId],
  );

  const createPrefill = useMemo(() => {
    if (!createFromQuery) return null;

    const estimatedSavings = searchParams.get("estimatedSavings");
    const baselineValue = searchParams.get("baselineValue");
    const targetValue = searchParams.get("targetValue");

    return {
      title: searchParams.get("title") ?? "",
      description: searchParams.get("description") ?? "",
      departmentId: searchParams.get("departmentId") ?? undefined,
      ownerEmployeeId: searchParams.get("ownerEmployeeId") ?? undefined,
      proposedAction: searchParams.get("proposedAction") ?? "",
      dueDateUtc: searchParams.get("dueDateUtc") ?? undefined,
      baselineMetricName: searchParams.get("metricName") ?? "",
      metricUnit: searchParams.get("metricUnit") ?? "",
      estimatedSavingsPerMonth: estimatedSavings
        ? Number(estimatedSavings)
        : null,
      baselineValue: baselineValue ? Number(baselineValue) : null,
      targetValue: targetValue ? Number(targetValue) : null,
      notes: searchParams.get("notes") ?? "",
    };
  }, [createFromQuery, searchParams]);

  const clearCreateSearch = () => {
    if (!createFromQuery) return;

    const next = new URLSearchParams(searchParams);

    [
      "create",
      "title",
      "description",
      "departmentId",
      "ownerEmployeeId",
      "proposedAction",
      "dueDateUtc",
      "metricName",
      "metricUnit",
      "estimatedSavings",
      "baselineValue",
      "targetValue",
      "notes",
    ].forEach((key) => next.delete(key));

    setSearchParams(next, { replace: true });
  };

  const handleCreated = (idea: ImprovementIdeaDto) => {
    setIdeas((prev) =>
      [idea, ...prev].sort(
        (a, b) => Date.parse(b.updatedAtUtc) - Date.parse(a.updatedAtUtc),
      ),
    );
    setSelectedIdeaId(idea.id);
    setSidePanelMode("decision");
    clearCreateSearch();
  };

  const handleUpdated = (updatedIdea: ImprovementIdeaDto) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === updatedIdea.id ? updatedIdea : idea)),
    );
    setSelectedIdeaId(updatedIdea.id);
    setSidePanelMode("decision");
  };

  const handleStatusChange = async (
    ideaId: string,
    status: ImprovementStatus,
  ) => {
    setUpdatingIdeaId(ideaId);

    try {
      const updated = await improvementIdeasApi.setStatus(ideaId, { status });
      handleUpdated(updated);
    } catch (err) {
      setError(toApiError(err, "Nie udało się zmienić statusu usprawnienia."));
    } finally {
      setUpdatingIdeaId(null);
    }
  };

  return (
    <>
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full min-h-0 flex-col gap-3">
          {error ? (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
              {error.message}
            </div>
          ) : null}

          <header className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Lean dashboard
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {insights.activeIdeas.length} aktywnych
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
                  <h1 className="text-xl font-semibold tracking-tight text-white">
                    Wszystkie usprawnienia
                  </h1>

                  <p className="text-sm text-slate-400">
                    Lista, decyzje, KPI i priorytety w jednym widoku.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingIdea(null);
                    setOpenAdd(true);
                  }}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-4 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  + Dodaj usprawnienie
                </button>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Odśwież
                </button>

                <Link
                  to="/departments"
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Działy
                </Link>

                <Link
                  to="/employees"
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Właściciele
                </Link>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <CompactMetric
                label="Aktywne"
                value={String(insights.activeIdeas.length)}
                hint="W toku"
                tone="cyan"
              />

              <CompactMetric
                label="Quick wins"
                value={String(insights.quickWins.length)}
                hint="Szybkie wdrożenia"
                tone="emerald"
              />

              <CompactMetric
                label="Po terminie"
                value={String(insights.overdueIdeas.length)}
                hint="Pilne"
                tone={insights.overdueIdeas.length > 0 ? "rose" : "slate"}
              />

              <CompactMetric
                label="Potencjał / mies."
                value={formatCurrency(insights.savingsPotential)}
                hint="Szacunek"
                tone="sky"
              />

              <CompactMetric
                label="Efekt / mies."
                value={formatCurrency(insights.realizedSavings)}
                hint={
                  insights.avgImprovement != null
                    ? `KPI ${insights.avgImprovement.toFixed(1)}%`
                    : "Bez pomiaru"
                }
                tone="violet"
              />
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.85fr)]">
            <main className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="border-b border-slate-800 bg-slate-900/95 px-4 py-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                      Główna lista
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Kliknij pozycję, aby otworzyć panel decyzji po prawej
                      stronie.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[34rem]">
                    <CompactAlert
                      label="Po terminie"
                      value={String(insights.overdueIdeas.length)}
                      hint="Najpilniejsze"
                      tone={insights.overdueIdeas.length > 0 ? "rose" : "slate"}
                    />

                    <CompactAlert
                      label="Na teraz"
                      value={String(insights.dueSoonIdeas.length)}
                      hint="Zbliża się termin"
                      tone={
                        insights.dueSoonIdeas.length > 0 ? "amber" : "slate"
                      }
                    />

                    <CompactAlert
                      label="Hot spot"
                      value={
                        insights.wasteHotspots[0]
                          ? (wasteLabels[insights.wasteHotspots[0].wasteType] ??
                            "Inna")
                          : "-"
                      }
                      hint="Najczęstsza strata"
                      tone="cyan"
                    />
                  </div>
                </div>

                <div className="mt-3 grid gap-2 xl:grid-cols-4">
                  {insights.recommendedIdeas.map((idea) => (
                    <button
                      key={idea.id}
                      type="button"
                      onClick={() => {
                        setSelectedIdeaId(idea.id);
                        setSidePanelMode("decision");
                      }}
                      className={[
                        "group rounded-xl border px-3 py-2 text-left transition",
                        selectedIdeaId === idea.id
                          ? "border-cyan-400/35 bg-cyan-400/[0.08]"
                          : "border-slate-800 bg-slate-950/50 hover:border-cyan-400/25 hover:bg-slate-900",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-100">
                          Do decyzji
                        </span>

                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            getPriorityBadgeClass(idea.priorityScore),
                          ].join(" ")}
                        >
                          {getPriorityLabel(idea.priorityScore)}
                        </span>
                      </div>

                      <div className="mt-1 line-clamp-1 text-sm font-semibold text-white">
                        {idea.title}
                      </div>

                      <div className="mt-1 line-clamp-1 text-xs text-slate-400">
                        {idea.ownerEmployeeName ?? "Bez właściciela"}
                      </div>
                    </button>
                  ))}

                  {insights.recommendedIdeas.length === 0 ? (
                    <div className="xl:col-span-4">
                      <EmptyBox text="Brak otwartych usprawnień do priorytetyzacji." />
                    </div>
                  ) : null}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
                  Ładowanie tablicy lean...
                </div>
              ) : null}

              {!loading && ideas.length === 0 ? (
                <EmptyStatePanel
                  title="Brak usprawnień"
                  description="Dodaj pierwszy pomysł i zbuduj backlog lean. To będzie główna lista do codziennej pracy."
                  actionLabel="Dodaj pierwszy pomysł"
                  onAction={() => {
                    setEditingIdea(null);
                    setOpenAdd(true);
                  }}
                />
              ) : null}

              {!loading && ideas.length > 0 ? (
                <div className="min-h-0 flex-1 overflow-hidden">
                  <div className="h-full overflow-auto">
                    <table className="w-full min-w-[58rem] text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur">
                        <tr className="border-b border-slate-800 text-left text-[11px] uppercase tracking-[0.14em] text-slate-500">
                          <th className="px-4 py-3">Pomysł</th>
                          <th className="px-4 py-3">KPI</th>
                          <th className="px-4 py-3">Priorytet</th>
                          <th className="px-4 py-3">Termin</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Akcje</th>
                        </tr>
                      </thead>

                      <tbody>
                        {ideas.map((idea) => (
                          <tr
                            key={idea.id}
                            className={[
                              "border-b border-slate-800/80 align-top last:border-0",
                              selectedIdeaId === idea.id
                                ? "bg-cyan-400/[0.06]"
                                : "bg-slate-900/40 hover:bg-slate-800/70",
                            ].join(" ")}
                          >
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIdeaId(idea.id);
                                  setSidePanelMode("decision");
                                }}
                                className="w-full text-left"
                              >
                                <div className="line-clamp-1 font-semibold text-white">
                                  {idea.title}
                                </div>

                                <div className="mt-1 line-clamp-1 text-xs text-slate-400">
                                  {idea.departmentName ?? "Bez działu"}
                                  {" · "}
                                  {idea.ownerEmployeeName ?? "Bez właściciela"}
                                </div>

                                <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                                  {wasteLabels[idea.wasteType] ?? "Inna strata"}
                                </div>
                              </button>
                            </td>

                            <td className="px-4 py-3">
                              {idea.baselineMetricName ? (
                                <div className="max-w-[17rem] text-xs text-slate-400">
                                  <div className="line-clamp-1 font-semibold text-slate-200">
                                    {idea.baselineMetricName}
                                    {idea.metricUnit
                                      ? ` [${idea.metricUnit}]`
                                      : ""}
                                  </div>

                                  <div className="mt-1 line-clamp-1">
                                    Przed:{" "}
                                    {formatMetricValue(idea.baselineValue)}
                                    {" · "}
                                    Cel: {formatMetricValue(idea.targetValue)}
                                    {" · "}
                                    Po: {formatMetricValue(idea.actualValue)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  Brak KPI
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={[
                                    "rounded-full px-2 py-0.5 text-xs font-bold",
                                    getPriorityBadgeClass(idea.priorityScore),
                                  ].join(" ")}
                                >
                                  {getPriorityLabel(idea.priorityScore)}
                                </span>

                                <span className="text-xs text-slate-500">
                                  {idea.priorityScore} pkt
                                </span>

                                {idea.quickWin ? (
                                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2 py-0.5 text-xs font-bold text-emerald-100">
                                    Quick win
                                  </span>
                                ) : null}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={[
                                  "text-sm font-medium",
                                  idea.isOverdue
                                    ? "text-rose-200"
                                    : idea.isDueSoon
                                      ? "text-amber-200"
                                      : "text-slate-300",
                                ].join(" ")}
                              >
                                {formatDueDate(idea)}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              <select
                                value={idea.status}
                                disabled={updatingIdeaId === idea.id}
                                onChange={(event) =>
                                  void handleStatusChange(
                                    idea.id,
                                    Number(
                                      event.target.value,
                                    ) as ImprovementStatus,
                                  )
                                }
                                className="rounded-xl border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50 disabled:opacity-50"
                              >
                                {Object.values(ImprovementStatus).map(
                                  (value) =>
                                    typeof value === "number" ? (
                                      <option key={value} value={value}>
                                        {
                                          statusLabels[
                                            value as ImprovementStatus
                                          ]
                                        }
                                      </option>
                                    ) : null,
                                )}
                              </select>
                            </td>

                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedIdeaId(idea.id);
                                    setSidePanelMode("decision");
                                  }}
                                  className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                                >
                                  Podgląd
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEditingIdea(idea)}
                                  className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                                >
                                  Edytuj
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </main>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                  <PanelTab
                    active={sidePanelMode === "decision"}
                    onClick={() => setSidePanelMode("decision")}
                  >
                    Decyzje
                  </PanelTab>

                  <PanelTab
                    active={sidePanelMode === "board"}
                    onClick={() => setSidePanelMode("board")}
                  >
                    Tablica
                  </PanelTab>

                  <PanelTab
                    active={sidePanelMode === "insights"}
                    onClick={() => setSidePanelMode("insights")}
                  >
                    Efekty
                  </PanelTab>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {sidePanelMode === "decision" ? (
                  <DecisionPanel
                    selectedIdea={selectedIdea}
                    updatingIdeaId={updatingIdeaId}
                    onEdit={(idea) => setEditingIdea(idea)}
                    onStatusChange={handleStatusChange}
                  />
                ) : null}

                {sidePanelMode === "board" ? (
                  <BoardPanel
                    boardColumns={boardColumns}
                    selectedIdeaId={selectedIdeaId}
                    onSelectIdea={(ideaId) => {
                      setSelectedIdeaId(ideaId);
                      setSidePanelMode("decision");
                    }}
                  />
                ) : null}

                {sidePanelMode === "insights" ? (
                  <InsightsPanel
                    insights={insights}
                    selectedIdeaId={selectedIdeaId}
                    onSelectIdea={(ideaId) => {
                      setSelectedIdeaId(ideaId);
                      setSidePanelMode("decision");
                    }}
                  />
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <AddImprovementIdeaModal
        open={openAdd || !!editingIdea}
        idea={editingIdea}
        departments={departments}
        employees={employees}
        onClose={() => {
          setOpenAdd(false);
          setEditingIdea(null);
          clearCreateSearch();
        }}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        prefill={editingIdea ? null : createPrefill}
      />
    </>
  );
}

function DecisionPanel({
  selectedIdea,
  updatingIdeaId,
  onEdit,
  onStatusChange,
}: {
  selectedIdea: ImprovementIdeaDto | null;
  updatingIdeaId: string | null;
  onEdit: (idea: ImprovementIdeaDto) => void;
  onStatusChange: (ideaId: string, status: ImprovementStatus) => Promise<void>;
}) {
  if (!selectedIdea) {
    return (
      <div className="p-3">
        <EmptyBox text="Wybierz pozycję z listy albo z sekcji „Do decyzji”, aby zobaczyć szczegóły i akcje." />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-3">
      <div className="space-y-3">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-200">
              {statusLabels[selectedIdea.status]}
            </span>

            <span
              className={[
                "rounded-full px-2.5 py-1 text-xs font-bold",
                getPriorityBadgeClass(selectedIdea.priorityScore),
              ].join(" ")}
            >
              {getPriorityLabel(selectedIdea.priorityScore)}
            </span>

            <span className="rounded-full border border-violet-400/25 bg-violet-400/[0.08] px-2.5 py-1 text-xs font-semibold text-violet-100">
              {impactLabels[selectedIdea.impact]}
            </span>

            {selectedIdea.quickWin ? (
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-xs font-bold text-emerald-100">
                Quick win
              </span>
            ) : null}
          </div>

          <div className="mt-3 text-lg font-semibold leading-tight text-white">
            {selectedIdea.title}
          </div>

          <div className="mt-2 line-clamp-4 text-sm leading-6 text-slate-300">
            {selectedIdea.description}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SmallMetric
            label="Dział"
            value={selectedIdea.departmentName ?? "Bez działu"}
          />

          <SmallMetric
            label="Właściciel"
            value={selectedIdea.ownerEmployeeName ?? "Bez właściciela"}
          />

          <SmallMetric
            label="Termin"
            value={formatDueDate(selectedIdea)}
            tone={
              selectedIdea.isOverdue
                ? "rose"
                : selectedIdea.isDueSoon
                  ? "amber"
                  : "slate"
            }
          />

          <SmallMetric
            label="Typ straty"
            value={wasteLabels[selectedIdea.wasteType] ?? "Inna strata"}
          />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
            KPI i wynik
          </div>

          {selectedIdea.baselineMetricName ? (
            <div className="mt-2 space-y-2">
              <div className="line-clamp-1 text-sm font-semibold text-white">
                {selectedIdea.baselineMetricName}
                {selectedIdea.metricUnit ? ` [${selectedIdea.metricUnit}]` : ""}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <SmallMetric
                  label="Przed"
                  value={formatMetricValue(selectedIdea.baselineValue)}
                />

                <SmallMetric
                  label="Cel"
                  value={formatMetricValue(selectedIdea.targetValue)}
                />

                <SmallMetric
                  label="Po"
                  value={formatMetricValue(selectedIdea.actualValue)}
                />

                <SmallMetric
                  label="Poprawa KPI"
                  value={
                    selectedIdea.improvementPercent != null
                      ? `${selectedIdea.improvementPercent}%`
                      : "-"
                  }
                  tone="cyan"
                />

                <SmallMetric
                  label="Realizacja"
                  value={
                    selectedIdea.targetAchievementPercent != null
                      ? `${selectedIdea.targetAchievementPercent}%`
                      : "-"
                  }
                  tone="violet"
                />

                <SmallMetric
                  label="Efekt / mies."
                  value={formatNullableCurrency(
                    selectedIdea.implementedSavingsPerMonth,
                  )}
                  tone="emerald"
                />
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-500">
              Brak zdefiniowanego KPI.
            </div>
          )}
        </div>

        {selectedIdea.proposedAction ? (
          <DetailBlock
            title="Plan działania"
            content={selectedIdea.proposedAction}
          />
        ) : null}

        {selectedIdea.rootCause ? (
          <DetailBlock
            title="Przyczyna źródłowa"
            content={selectedIdea.rootCause}
          />
        ) : null}

        {selectedIdea.resultSummary ? (
          <DetailBlock
            title="Efekt wdrożenia"
            content={selectedIdea.resultSummary}
          />
        ) : null}

        {selectedIdea.notes ? (
          <DetailBlock title="Notatki" content={selectedIdea.notes} />
        ) : null}

        <div className="sticky bottom-0 z-10 grid gap-2 border-t border-slate-800 bg-slate-900/95 pt-3 backdrop-blur">
          <button
            type="button"
            onClick={() => onEdit(selectedIdea)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Edytuj usprawnienie
          </button>

          {selectedIdea.status !== ImprovementStatus.InProgress ? (
            <button
              type="button"
              disabled={updatingIdeaId === selectedIdea.id}
              onClick={() =>
                void onStatusChange(
                  selectedIdea.id,
                  ImprovementStatus.InProgress,
                )
              }
              className="rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2 text-sm font-bold text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-400/[0.12] disabled:opacity-60"
            >
              Oznacz realizację
            </button>
          ) : null}

          {selectedIdea.status !== ImprovementStatus.Implemented ? (
            <button
              type="button"
              disabled={updatingIdeaId === selectedIdea.id}
              onClick={() =>
                void onStatusChange(
                  selectedIdea.id,
                  ImprovementStatus.Implemented,
                )
              }
              className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:opacity-60"
            >
              Oznacz wdrożenie
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BoardPanel({
  boardColumns,
  selectedIdeaId,
  onSelectIdea,
}: {
  boardColumns: {
    status: ImprovementStatus;
    ideas: ImprovementIdeaDto[];
  }[];
  selectedIdeaId: string | null;
  onSelectIdea: (ideaId: string) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid gap-3">
        {boardColumns.map(({ status, ideas: ideasForStatus }) => (
          <div
            key={status}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white">
                {statusLabels[status]}
              </h3>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-semibold text-slate-300">
                {ideasForStatus.length}
              </span>
            </div>

            <div className="grid gap-2">
              {ideasForStatus.slice(0, 5).map((idea) => (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() => onSelectIdea(idea.id)}
                  className={[
                    "w-full rounded-xl border px-3 py-2 text-left transition",
                    selectedIdeaId === idea.id
                      ? "border-cyan-400/35 bg-cyan-400/[0.08]"
                      : "border-slate-800 bg-slate-900/70 hover:border-cyan-400/25 hover:bg-slate-800",
                  ].join(" ")}
                >
                  <div className="line-clamp-1 text-sm font-semibold text-white">
                    {idea.title}
                  </div>

                  <div className="mt-1 line-clamp-1 text-xs text-slate-400">
                    {idea.ownerEmployeeName ?? "Bez właściciela"}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[11px] font-bold",
                        getPriorityBadgeClass(idea.priorityScore),
                      ].join(" ")}
                    >
                      {getPriorityLabel(idea.priorityScore)}
                    </span>

                    {idea.quickWin ? (
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2 py-0.5 text-[11px] font-bold text-emerald-100">
                        Quick win
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}

              {ideasForStatus.length === 0 ? (
                <EmptyBox text="Brak pozycji w tej kolumnie." />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightsPanel({
  insights,
  selectedIdeaId,
  onSelectIdea,
}: {
  insights: InsightsData;
  selectedIdeaId: string | null;
  onSelectIdea: (ideaId: string) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <div className="grid gap-3">
        <InsightCard
          title="Profil strat w backlogu"
          subtitle="Najczęstsze źródła marnotrawstwa"
        >
          <div className="space-y-3">
            {insights.wasteHotspots.map((item) => (
              <div key={item.wasteType}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="line-clamp-1 font-semibold text-white">
                    {wasteLabels[item.wasteType] ?? "Inna strata"}
                  </span>

                  <span className="text-slate-400">{item.count}</span>
                </div>

                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-cyan-300/35"
                    style={{
                      width: `${Math.max(
                        12,
                        (item.count /
                          Math.max(insights.activeIdeas.length, 1)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {insights.wasteHotspots.length === 0 ? (
              <EmptyBox text="Profil strat pojawi się po dodaniu aktywnych pomysłów." />
            ) : null}
          </div>
        </InsightCard>

        <InsightCard
          title="Wdrożone z efektem"
          subtitle="Najnowsze pomysły z wynikiem"
        >
          <div className="space-y-2">
            {insights.implementedHighlights.map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => onSelectIdea(idea.id)}
                className={[
                  "w-full rounded-xl border px-3 py-3 text-left transition",
                  selectedIdeaId === idea.id
                    ? "border-cyan-400/35 bg-cyan-400/[0.08]"
                    : "border-slate-800 bg-slate-950/70 hover:border-cyan-400/25 hover:bg-slate-900",
                ].join(" ")}
              >
                <div className="line-clamp-1 text-sm font-semibold text-white">
                  {idea.title}
                </div>

                <div className="mt-1 line-clamp-1 text-xs text-slate-400">
                  {idea.departmentName ?? "Bez działu"}
                </div>

                <div className="mt-2 text-xs text-slate-300">
                  {idea.improvementPercent != null
                    ? `Poprawa KPI: ${idea.improvementPercent}%`
                    : "Brak pełnego pomiaru poprawy"}
                </div>

                <div className="mt-1 text-xs text-slate-300">
                  {idea.implementedSavingsPerMonth != null
                    ? `Efekt: ${formatCurrency(idea.implementedSavingsPerMonth)}/mies.`
                    : "Bez oszacowanych oszczędności"}
                </div>
              </button>
            ))}

            {insights.implementedHighlights.length === 0 ? (
              <EmptyBox text="Dodaj wynik wdrożenia, aby pokazać efekty before/after." />
            ) : null}
          </div>
        </InsightCard>
      </div>
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
        "rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition",
        active
          ? "border-cyan-400/35 bg-cyan-400/[0.10] text-cyan-100"
          : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CompactMetric({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: MetricTone;
}) {
  const toneClasses: Record<MetricTone, string> = {
    slate: "border-slate-700 bg-slate-900 text-slate-100",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
    sky: "border-sky-400/25 bg-sky-400/[0.08] text-sky-100",
    rose: "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
    cyan: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
    violet: "border-violet-400/25 bg-violet-400/[0.08] text-violet-100",
  };

  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClasses[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">
        {label}
      </div>

      <div className="mt-1 truncate text-lg font-bold leading-none">
        {value}
      </div>

      <div className="mt-1 truncate text-xs opacity-75">{hint}</div>
    </div>
  );
}

function CompactAlert({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: AlertTone;
  hint: string;
}) {
  const toneClasses: Record<AlertTone, string> = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-200",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
    rose: "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
    cyan: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">
        {label}
      </div>

      <div className="mt-1 line-clamp-1 text-sm font-bold">{value}</div>

      <div className="mt-0.5 line-clamp-1 text-xs opacity-75">{hint}</div>
    </div>
  );
}

function InsightCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-white">{title}</h2>

          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>

      {children}
    </div>
  );
}

function SmallMetric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: SmallMetricTone;
}) {
  const toneClasses: Record<SmallMetricTone, string> = {
    slate: "border-slate-800 bg-slate-950/70 text-slate-100",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
    rose: "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
    cyan: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
    violet: "border-violet-400/25 bg-violet-400/[0.08] text-violet-100",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-60">
        {label}
      </div>

      <div className="mt-1 line-clamp-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function DetailBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>

      <div className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-300">
        {content}
      </div>
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

function EmptyStatePanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <div>
        <div className="text-lg font-bold text-white">{title}</div>

        <div className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          {description}
        </div>

        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-4 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function getPriorityLabel(score: number) {
  if (score >= 90) return "Krytyczny";
  if (score >= 65) return "Wysoki";
  if (score >= 40) return "Średni";
  if (score > 0) return "Niski";
  return "Zamknięty";
}

function getPriorityBadgeClass(score: number) {
  if (score >= 90) {
    return "border border-rose-400/30 bg-rose-400/[0.10] text-rose-100";
  }

  if (score >= 65) {
    return "border border-amber-400/30 bg-amber-400/[0.10] text-amber-100";
  }

  if (score >= 40) {
    return "border border-sky-400/30 bg-sky-400/[0.10] text-sky-100";
  }

  if (score > 0) {
    return "border border-slate-500/40 bg-slate-700/45 text-slate-200";
  }

  return "border border-emerald-400/30 bg-emerald-400/[0.10] text-emerald-100";
}

function formatDueDate(idea: ImprovementIdeaDto) {
  if (!idea.dueDateUtc) {
    return "-";
  }

  const formatted = new Date(idea.dueDateUtc).toLocaleDateString("pl-PL");

  if (idea.isOverdue) {
    return `${formatted} · po terminie`;
  }

  if (idea.isDueSoon) {
    return `${formatted} · wkrótce`;
  }

  return formatted;
}

function formatMetricValue(value?: number | null) {
  return value != null ? String(value) : "-";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNullableCurrency(value?: number | null) {
  return value != null ? formatCurrency(value) : "-";
}
