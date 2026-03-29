import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { OperationalStatusBadge } from "../../../shared/ui/OperationalStatusBadge";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { assetsApi } from "../../machines/api/assetsApi";
import { AssetType, type AssetListItemDto } from "../../machines/api/contracts";
import {
  FailureSeverity,
  FailureStatus,
  type FailureAnalyticsDto,
  type FailureCauseCategoryDto,
  type FailureReportDto,
} from "../api/contracts";
import { failureReportsApi } from "../api/failureReportsApi";
import {
  IncidentsFilters,
  type SortDir,
  type SortKey,
} from "./components/IncidentsFilters";
import { AddIncidentModal } from "./components/AddIncidentModal";

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<FailureReportDto[]>([]);
  const [machines, setMachines] = useState<AssetListItemDto[]>([]);
  const [analytics, setAnalytics] = useState<FailureAnalyticsDto | null>(null);
  const [causeCategories, setCauseCategories] = useState<FailureCauseCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | FailureStatus>("");
  const [severity, setSeverity] = useState<"" | FailureSeverity>("");
  const [machineId, setMachineId] = useState<"" | string>("");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [dir, setDir] = useState<SortDir>("desc");
  const [openAdd, setOpenAdd] = useState(false);

  const reset = () => {
    setQ("");
    setStatus("");
    setSeverity("");
    setMachineId("");
    setSortBy("createdAt");
    setDir("desc");
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      failureReportsApi.list({ openOnly: false }),
      assetsApi.list(),
      failureReportsApi.getAnalytics(),
      failureReportsApi.listCauseCategories(false),
    ]);

    const [reportsResult, assetsResult, analyticsResult, categoriesResult] = results;
    const firstRejected = results.find((result) => result.status === "rejected");

    setIncidents(reportsResult.status === "fulfilled" ? reportsResult.value ?? [] : []);
    setMachines(
      (assetsResult.status === "fulfilled" ? assetsResult.value ?? [] : []).filter(
        (asset) => asset.type === AssetType.Machine
      )
    );
    setAnalytics(analyticsResult.status === "fulfilled" ? analyticsResult.value : null);
    setCauseCategories(
      categoriesResult.status === "fulfilled" ? categoriesResult.value ?? [] : []
    );
    setLoading(false);
    setError(
      firstRejected
        ? toApiError(firstRejected.reason, "Nie udało się pobrać awarii.")
        : null
    );
  };

  useEffect(() => {
    void loadData();
  }, []);

  const machineName = (id?: string | null) =>
    machines.find((machine) => machine.id === id)?.name ?? "-";

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();

    const base = incidents
      .filter((incident) => {
        if (!norm) return true;

        return (
          incident.title.toLowerCase().includes(norm) ||
          (incident.description ?? "").toLowerCase().includes(norm) ||
          machineName(incident.assetId).toLowerCase().includes(norm) ||
          (incident.failureCauseCategoryName ?? "").toLowerCase().includes(norm)
        );
      })
      .filter((incident) => (status ? incident.status === status : true))
      .filter((incident) => (severity ? incident.severity === severity : true))
      .filter((incident) => (machineId ? incident.assetId === machineId : true));

    return base.sort((left, right) => {
      const valueFor = (item: FailureReportDto) => {
        if (sortBy === "createdAt") return item.reportedAtUtc;
        if (sortBy === "severity") return item.severity;
        if (sortBy === "status") return item.status;
        return item.title.toLowerCase();
      };

      const leftValue = valueFor(left);
      const rightValue = valueFor(right);

      if (leftValue < rightValue) return dir === "asc" ? -1 : 1;
      if (leftValue > rightValue) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [dir, incidents, machineId, machines, q, severity, sortBy, status]);

  const machineOptions = useMemo(
    () =>
      machines.map((machine) => ({
        assetId: machine.id,
        assetName: machine.name,
      })),
    [machines]
  );

  const handleCreated = (incident: FailureReportDto) => {
    setIncidents((prev) => [incident, ...prev]);
  };

  return (
    <>
      <PageHeader
        title="Awarie i usterki"
        extra={
          <div className="flex items-center gap-3">
            <IncidentsFilters
              q={q}
              onQChange={setQ}
              status={status}
              onStatusChange={setStatus}
              severity={severity}
              onSeverityChange={setSeverity}
              machineId={machineId}
              onMachineChange={setMachineId}
              machines={machineOptions}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              dir={dir}
              onToggleDir={() => setDir((current) => (current === "asc" ? "desc" : "asc"))}
              onReset={reset}
            />
            <Link
              to="/machines"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Maszyny
            </Link>
            <Link
              to="/work-orders"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Zlecenia
            </Link>
            <button
              onClick={() => void loadData()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj zgłoszenie
            </button>
          </div>
        }
      />

      {analytics ? (
        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <KpiCard label="Otwarte awarie" value={String(analytics.openIncidentsCount)} />
          <KpiCard label="Przestoje" value={String(analytics.downtimeIncidentsCount)} />
          <KpiCard label="MTTR [h]" value={analytics.mttrHours?.toFixed(2) ?? "-"} />
          <KpiCard label="MTBF [h]" value={analytics.mtbfHours?.toFixed(2) ?? "-"} />
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Pareto przyczyn" subtitle="Największe źródła strat z czasu przestoju.">
          <div className="space-y-3">
            {(analytics?.pareto ?? []).slice(0, 5).map((item) => (
              <div key={item.causeName}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{item.causeName}</span>
                  <span className="text-slate-500">
                    {item.totalDowntimeMinutes} min · {Math.round(item.cumulativeShare * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{ width: `${Math.max(8, item.share * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {(analytics?.pareto?.length ?? 0) === 0 ? (
              <EmptyCard text="Pareto pojawi się po zebraniu przyczyn i czasów przestoju." />
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Słownik przyczyn"
          subtitle="Aktualne kategorie źródłowe i skala ich wpływu."
        >
          <div className="space-y-2">
            {causeCategories.map((category) => (
              <div
                key={category.id}
                className="rounded-lg border border-slate-100 px-3 py-3"
              >
                <div className="text-sm font-medium text-slate-900">{category.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {category.incidentsCount} zgłoszeń · {category.totalDowntimeMinutes} min przestoju
                </div>
              </div>
            ))}
            {causeCategories.length === 0 ? (
              <EmptyCard text="Brak zdefiniowanych kategorii przyczyn." />
            ) : null}
          </div>
        </SectionCard>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">Ładowanie awarii...</div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error.message}
          </div>
        ) : null}

        {!loading && !error ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Tytuł</th>
                <th className="py-2">Maszyna</th>
                <th className="py-2">Przyczyna</th>
                <th className="py-2">Priorytet</th>
                <th className="py-2">Status</th>
                <th className="py-2">Przestój</th>
                <th className="py-2">Zgłoszono</th>
                <th className="py-2 w-56">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((incident) => (
                <tr key={incident.id} className="border-b last:border-0 align-top">
                  <td className="py-3">
                    <div className="font-medium text-slate-900">{incident.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {incident.description}
                    </div>
                  </td>
                  <td className="py-3">{machineName(incident.assetId)}</td>
                  <td className="py-3">{incident.failureCauseCategoryName ?? "-"}</td>
                  <td className="py-3">
                    <OperationalStatusBadge
                      label={severityLabel(incident.severity)}
                      tone={severityTone(incident.severity)}
                    />
                  </td>
                  <td className="py-3">
                    <OperationalStatusBadge
                      label={statusLabel(incident.status)}
                      tone={statusTone(incident.status)}
                    />
                  </td>
                  <td className="py-3">
                    {incident.causesDowntime ? (
                      <span className="text-rose-700">
                        {incident.downtimeMinutes != null
                          ? `${incident.downtimeMinutes} min`
                          : "Tak"}
                      </span>
                    ) : (
                      <span className="text-slate-500">Nie</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-500">
                    {formatDateTime(incident.reportedAtUtc)}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/incidents/${incident.id}`}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Szczegóły
                      </Link>
                      {incident.assetId ? (
                        <Link
                          to={`/machines/${incident.assetId}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Maszyna
                        </Link>
                      ) : null}
                      {incident.workOrderIds[0] ? (
                        <Link
                          to={`/work-orders/${incident.workOrderIds[0]}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Zlecenie
                        </Link>
                      ) : null}
                      <Link
                        to={buildLeanCreateLink(incident)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Kaizen
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <AddIncidentModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        machines={machines}
        causeCategories={causeCategories}
        onCreated={handleCreated}
      />
    </>
  );
}

function buildLeanCreateLink(incident: FailureReportDto) {
  const params = new URLSearchParams({
    create: "1",
    title: `Kaizen po awarii: ${incident.title}`,
    description: incident.description,
    proposedAction: incident.preventiveAction ?? incident.correctiveAction ?? "",
    notes: [
      `Źródło: awaria ${incident.title}`,
      incident.rootCause ? `Przyczyna źródłowa: ${incident.rootCause}` : null,
      incident.assetId ? `Powiązana maszyna: ${incident.assetId}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return `/lean?${params.toString()}`;
}

function statusLabel(value: FailureStatus) {
  if (value === FailureStatus.Open) return "Nowe";
  if (value === FailureStatus.Triaged) return "Wstępnie ocenione";
  if (value === FailureStatus.InProgress) return "W trakcie";
  if (value === FailureStatus.Resolved) return "Rozwiązane";
  return "Zamknięte";
}

function statusTone(value: FailureStatus) {
  if (value === FailureStatus.Open) return "danger" as const;
  if (value === FailureStatus.Triaged) return "info" as const;
  if (value === FailureStatus.InProgress) return "warning" as const;
  if (value === FailureStatus.Resolved) return "success" as const;
  return "neutral" as const;
}

function severityLabel(value: FailureSeverity) {
  if (value === FailureSeverity.Critical) return "Krytyczny";
  if (value === FailureSeverity.High) return "Wysoki";
  if (value === FailureSeverity.Medium) return "Średni";
  return "Niski";
}

function severityTone(value: FailureSeverity) {
  if (value === FailureSeverity.Critical) return "danger" as const;
  if (value === FailureSeverity.High) return "warning" as const;
  if (value === FailureSeverity.Medium) return "info" as const;
  return "neutral" as const;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}
