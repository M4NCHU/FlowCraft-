import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
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

export function LeanIdeasScreen() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [ideas, setIdeas] = useState<ImprovementIdeaDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingIdea, setEditingIdea] = useState<ImprovementIdeaDto | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [updatingIdeaId, setUpdatingIdeaId] = useState<string | null>(null);
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
    const firstRejected = results.find((result) => result.status === "rejected");

    const nextIdeas =
      ideasResult.status === "fulfilled" ? (ideasResult.value ?? []) : [];

    setIdeas(nextIdeas);
    setDepartments(
      departmentsResult.status === "fulfilled" ? departmentsResult.value ?? [] : []
    );
    setEmployees(
      employeesResult.status === "fulfilled" ? employeesResult.value ?? [] : []
    );
    setSelectedIdeaId((current) => current ?? nextIdeas[0]?.id ?? null);
    setLoading(false);
    setError(
      firstRejected
        ? toApiError(
            firstRejected.reason,
            "Nie udało się załadować tablicy usprawnień."
          )
        : null
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

  const insights = useMemo(() => {
    const activeIdeas = ideas.filter(
      (idea) =>
        idea.status !== ImprovementStatus.Implemented &&
        idea.status !== ImprovementStatus.Rejected
    );
    const quickWins = activeIdeas.filter((idea) => idea.quickWin);
    const implemented = ideas.filter(
      (idea) => idea.status === ImprovementStatus.Implemented
    );
    const savingsPotential = activeIdeas.reduce(
      (sum, idea) => sum + (idea.estimatedSavingsPerMonth ?? 0),
      0
    );
    const realizedSavings = implemented.reduce(
      (sum, idea) => sum + (idea.implementedSavingsPerMonth ?? 0),
      0
    );
    const measuredImplemented = implemented.filter(
      (idea) => idea.actualValue != null && idea.improvementPercent != null
    );
    const avgImprovement = measuredImplemented.length
      ? measuredImplemented.reduce(
          (sum, idea) => sum + (idea.improvementPercent ?? 0),
          0
        ) / measuredImplemented.length
      : null;
    const avgTargetAchievement = measuredImplemented.length
      ? measuredImplemented.reduce(
          (sum, idea) => sum + (idea.targetAchievementPercent ?? 0),
          0
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
      }, {})
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
    [ideas]
  );

  const selectedIdea = useMemo(
    () => ideas.find((idea) => idea.id === selectedIdeaId) ?? null,
    [ideas, selectedIdeaId]
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
      estimatedSavingsPerMonth: estimatedSavings ? Number(estimatedSavings) : null,
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
        (a, b) => Date.parse(b.updatedAtUtc) - Date.parse(a.updatedAtUtc)
      )
    );
    setSelectedIdeaId(idea.id);
    clearCreateSearch();
  };

  const handleUpdated = (updatedIdea: ImprovementIdeaDto) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === updatedIdea.id ? updatedIdea : idea))
    );
    setSelectedIdeaId(updatedIdea.id);
  };

  const handleStatusChange = async (
    ideaId: string,
    status: ImprovementStatus
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
      <PageHeader
        title="Lean i kaizen"
        extra={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/departments"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Działy
            </Link>
            <Link
              to="/employees"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Właściciele
            </Link>
            <button
              onClick={() => void loadData()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <button
              onClick={() => {
                setEditingIdea(null);
                setOpenAdd(true);
              }}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj usprawnienie
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Aktywne pomysły"
          value={String(insights.activeIdeas.length)}
          hint="Backlog i inicjatywy w realizacji"
        />
        <MetricCard
          label="Quick wins"
          value={String(insights.quickWins.length)}
          hint="Możliwe do wdrożenia szybko"
        />
        <MetricCard
          label="Potencjał oszczędności"
          value={formatCurrency(insights.savingsPotential)}
          hint="Szacowany miesięczny efekt backlogu"
        />
        <MetricCard
          label="Realne oszczędności"
          value={formatCurrency(insights.realizedSavings)}
          hint="Miesięczny efekt wdrożonych pomysłów"
        />
        <MetricCard
          label="Średnia poprawa KPI"
          value={
            insights.avgImprovement != null
              ? `${insights.avgImprovement.toFixed(1)}%`
              : "-"
          }
          hint={
            insights.avgTargetAchievement != null
              ? `Realizacja celu: ${insights.avgTargetAchievement.toFixed(1)}%`
              : "Pojawi się po pomiarach efektów"
          }
        />
      </div>
      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          {error.message}
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
        <InsightCard
          title="Rekomendowane do wdrożenia"
          subtitle="Wpływ, termin i potencjał oszczędności"
        >
          <div className="space-y-3">
            {insights.recommendedIdeas.map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => setSelectedIdeaId(idea.id)}
                className="w-full rounded-lg border border-slate-100 px-3 py-3 text-left hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-medium text-slate-900">{idea.title}</div>
                  <span
                    className={[
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      getPriorityBadgeClass(idea.priorityScore),
                    ].join(" ")}
                  >
                    {getPriorityLabel(idea.priorityScore)}
                  </span>
                  <span className="text-xs text-slate-500">{idea.priorityScore} pkt</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {idea.departmentName ?? "Bez działu"}
                  {" · "}
                  {wasteLabels[idea.wasteType] ?? "Inna strata"}
                  {" · "}
                  {impactLabels[idea.impact]}
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {idea.baselineMetricName
                    ? `${idea.baselineMetricName}${idea.metricUnit ? ` [${idea.metricUnit}]` : ""}`
                    : "Brak zdefiniowanego KPI"}
                </div>
              </button>
            ))}
            {insights.recommendedIdeas.length === 0 ? (
              <EmptyBox text="Brak otwartych usprawnień do priorytetyzacji." />
            ) : null}
          </div>
        </InsightCard>

        <InsightCard
          title="Profil strat w backlogu"
          subtitle="Najczęstsze źródła marnotrawstwa"
        >
          <div className="space-y-3">
            {insights.wasteHotspots.map((item) => (
              <div key={item.wasteType}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">
                    {wasteLabels[item.wasteType] ?? "Inna strata"}
                  </span>
                  <span className="text-slate-500">{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{
                      width: `${Math.max(
                        12,
                        (item.count / Math.max(insights.activeIdeas.length, 1)) * 100
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
          subtitle="Najnowsze pomysły z pomiarem wyniku"
        >
          <div className="space-y-3">
            {insights.implementedHighlights.map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => setSelectedIdeaId(idea.id)}
                className="w-full rounded-lg border border-slate-100 px-3 py-3 text-left hover:bg-slate-50"
              >
                <div className="text-sm font-medium text-slate-900">{idea.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {idea.departmentName ?? "Bez działu"}
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {idea.improvementPercent != null
                    ? `Poprawa KPI: ${idea.improvementPercent}%`
                    : "Brak pełnego pomiaru poprawy"}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {idea.implementedSavingsPerMonth != null
                    ? `Oszczędności: ${formatCurrency(idea.implementedSavingsPerMonth)}/mies.`
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

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Tablica działań</h2>
              <p className="mt-1 text-xs text-slate-500">
                Widok przepływu usprawnień od identyfikacji problemu do wdrożenia.
              </p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            {boardColumns.map(({ status, ideas: ideasForStatus }) => (
              <div
                key={status}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {statusLabels[status]}
                  </h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                    {ideasForStatus.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {ideasForStatus.slice(0, 5).map((idea) => (
                    <button
                      key={idea.id}
                      type="button"
                      onClick={() => setSelectedIdeaId(idea.id)}
                      className={[
                        "w-full rounded-lg border px-3 py-3 text-left",
                        selectedIdeaId === idea.id
                          ? "border-slate-900 bg-white"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="text-sm font-medium text-slate-900">{idea.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {idea.ownerEmployeeName ?? "Bez właściciela"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {wasteLabels[idea.wasteType] ?? "Inna strata"}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            getPriorityBadgeClass(idea.priorityScore),
                          ].join(" ")}
                        >
                          {getPriorityLabel(idea.priorityScore)}
                        </span>
                        {idea.quickWin ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
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

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Szczegóły usprawnienia
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Kontekst problemu, KPI i akcje dla wybranego pomysłu.
              </p>
            </div>
          </div>

          {selectedIdea ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-base font-semibold text-slate-900">
                  {selectedIdea.title}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {selectedIdea.description}
                </div>
              </div>

              <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <DetailItem label="Status" value={statusLabels[selectedIdea.status]} />
                <DetailItem label="Wpływ" value={impactLabels[selectedIdea.impact]} />
                <DetailItem
                  label="Dział"
                  value={selectedIdea.departmentName ?? "Bez działu"}
                />
                <DetailItem
                  label="Właściciel"
                  value={selectedIdea.ownerEmployeeName ?? "Bez właściciela"}
                />
                <DetailItem
                  label="Typ straty"
                  value={wasteLabels[selectedIdea.wasteType] ?? "Inna strata"}
                />
                <DetailItem label="Termin" value={formatDueDate(selectedIdea)} />
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  KPI przed / cel / po
                </div>
                <div className="mt-2 text-sm text-slate-900">
                  {selectedIdea.baselineMetricName ? (
                    <>
                      <div>
                        {selectedIdea.baselineMetricName}
                        {selectedIdea.metricUnit
                          ? ` [${selectedIdea.metricUnit}]`
                          : ""}
                      </div>
                      <div className="mt-1 text-slate-600">
                        Przed: {formatMetricValue(selectedIdea.baselineValue)}
                        {" · "}
                        Cel: {formatMetricValue(selectedIdea.targetValue)}
                        {" · "}
                        Po: {formatMetricValue(selectedIdea.actualValue)}
                      </div>
                    </>
                  ) : (
                    "Brak zdefiniowanego KPI."
                  )}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <SmallMetric
                    label="Poprawa KPI"
                    value={
                      selectedIdea.improvementPercent != null
                        ? `${selectedIdea.improvementPercent}%`
                        : "-"
                    }
                  />
                  <SmallMetric
                    label="Realizacja celu"
                    value={
                      selectedIdea.targetAchievementPercent != null
                        ? `${selectedIdea.targetAchievementPercent}%`
                        : "-"
                    }
                  />
                  <SmallMetric
                    label="Potencjał / mies."
                    value={formatNullableCurrency(
                      selectedIdea.estimatedSavingsPerMonth
                    )}
                  />
                  <SmallMetric
                    label="Efekt / mies."
                    value={formatNullableCurrency(
                      selectedIdea.implementedSavingsPerMonth
                    )}
                  />
                </div>
              </div>

              {selectedIdea.proposedAction ? (
                <DetailBlock title="Plan działania" content={selectedIdea.proposedAction} />
              ) : null}
              {selectedIdea.rootCause ? (
                <DetailBlock title="Przyczyna źródłowa" content={selectedIdea.rootCause} />
              ) : null}
              {selectedIdea.resultSummary ? (
                <DetailBlock title="Efekt wdrożenia" content={selectedIdea.resultSummary} />
              ) : null}
              {selectedIdea.notes ? (
                <DetailBlock title="Notatki" content={selectedIdea.notes} />
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditingIdea(selectedIdea)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edytuj
                </button>
                {selectedIdea.status !== ImprovementStatus.InProgress ? (
                  <button
                    type="button"
                    disabled={updatingIdeaId === selectedIdea.id}
                    onClick={() =>
                      void handleStatusChange(
                        selectedIdea.id,
                        ImprovementStatus.InProgress
                      )
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Oznacz realizację
                  </button>
                ) : null}
                {selectedIdea.status !== ImprovementStatus.Implemented ? (
                  <button
                    type="button"
                    disabled={updatingIdeaId === selectedIdea.id}
                    onClick={() =>
                      void handleStatusChange(
                        selectedIdea.id,
                        ImprovementStatus.Implemented
                      )
                    }
                    className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    Oznacz wdrożenie
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <EmptyBox text="Wybierz pomysł z tablicy albo z rekomendacji, aby zobaczyć szczegóły." />
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Ładowanie tablicy lean...
          </div>
        ) : null}

        {!loading && ideas.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Brak usprawnień. Dodaj pierwszy pomysł i zbuduj backlog lean.
          </div>
        ) : null}

        {!loading && ideas.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Pomysł</th>
                <th className="py-2">KPI przed / po</th>
                <th className="py-2">Wpływ</th>
                <th className="py-2">Priorytet</th>
                <th className="py-2">Termin</th>
                <th className="py-2">Status</th>
                <th className="py-2 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea) => (
                <tr key={idea.id} className="border-b last:border-0 align-top">
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedIdeaId(idea.id)}
                      className="text-left"
                    >
                      <div className="font-medium text-slate-900">{idea.title}</div>
                      <div className="text-xs text-slate-500">
                        {idea.departmentName ?? "Bez działu"}
                        {" · "}
                        {idea.ownerEmployeeName ?? "Bez właściciela"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {wasteLabels[idea.wasteType] ?? "Inna strata"}
                      </div>
                    </button>
                  </td>
                  <td className="py-3">
                    {idea.baselineMetricName ? (
                      <div className="text-xs text-slate-600">
                        <div>
                          {idea.baselineMetricName}
                          {idea.metricUnit ? ` [${idea.metricUnit}]` : ""}
                        </div>
                        <div>
                          Przed: {formatMetricValue(idea.baselineValue)} | Cel: {formatMetricValue(idea.targetValue)} | Po: {formatMetricValue(idea.actualValue)}
                        </div>
                        <div>
                          Efekt: {idea.improvementPercent != null ? `${idea.improvementPercent}%` : "brak pomiaru"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Brak KPI</span>
                    )}
                  </td>
                  <td className="py-3">{impactLabels[idea.impact]}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          getPriorityBadgeClass(idea.priorityScore),
                        ].join(" ")}
                      >
                        {getPriorityLabel(idea.priorityScore)}
                      </span>
                      <span className="text-xs text-slate-500">{idea.priorityScore}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span
                      className={
                        idea.isOverdue
                          ? "text-rose-700"
                          : idea.isDueSoon
                            ? "text-amber-800"
                            : "text-slate-600"
                      }
                    >
                      {formatDueDate(idea)}
                    </span>
                  </td>
                  <td className="py-3">
                    <select
                      value={idea.status}
                      disabled={updatingIdeaId === idea.id}
                      onChange={(event) =>
                        void handleStatusChange(
                          idea.id,
                          Number(event.target.value) as ImprovementStatus
                        )
                      }
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      {Object.values(ImprovementStatus).map((value) =>
                        typeof value === "number" ? (
                          <option key={value} value={value}>
                            {statusLabels[value as ImprovementStatus]}
                          </option>
                        ) : null
                      )}
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedIdeaId(idea.id)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Podgląd
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIdea(idea)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Edytuj
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
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

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="text-right text-xs text-slate-500">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}

function DetailBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{content}</div>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
      {text}
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
  if (score >= 90) return "bg-rose-50 text-rose-700";
  if (score >= 65) return "bg-amber-50 text-amber-800";
  if (score >= 40) return "bg-sky-50 text-sky-700";
  if (score > 0) return "bg-slate-100 text-slate-700";
  return "bg-emerald-50 text-emerald-700";
}

function formatDueDate(idea: ImprovementIdeaDto) {
  if (!idea.dueDateUtc) {
    return "-";
  }

  const formatted = new Date(idea.dueDateUtc).toLocaleDateString("pl-PL");

  if (idea.isOverdue) {
    return `${formatted} (po terminie)`;
  }

  if (idea.isDueSoon) {
    return `${formatted} (wkrótce)`;
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

