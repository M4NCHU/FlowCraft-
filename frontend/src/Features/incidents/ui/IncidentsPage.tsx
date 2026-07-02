import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import type { SortDir, SortKey } from "./components/IncidentsFilters";
import { AddIncidentModal } from "./components/AddIncidentModal";

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

export function IncidentsPage() {
  const [incidents, setIncidents] = useState<FailureReportDto[]>([]);
  const [machines, setMachines] = useState<AssetListItemDto[]>([]);
  const [analytics, setAnalytics] = useState<FailureAnalyticsDto | null>(null);
  const [causeCategories, setCauseCategories] = useState<
    FailureCauseCategoryDto[]
  >([]);
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

    const [reportsResult, assetsResult, analyticsResult, categoriesResult] =
      results;
    const firstRejected = results.find(
      (result) => result.status === "rejected",
    );

    const nextIncidents =
      reportsResult.status === "fulfilled" ? (reportsResult.value ?? []) : [];

    const nextAssets =
      assetsResult.status === "fulfilled" ? (assetsResult.value ?? []) : [];

    setIncidents(nextIncidents);
    setMachines(nextAssets.filter((asset) => asset.type === AssetType.Machine));
    setAnalytics(
      analyticsResult.status === "fulfilled" ? analyticsResult.value : null,
    );
    setCauseCategories(
      categoriesResult.status === "fulfilled"
        ? (categoriesResult.value ?? [])
        : [],
    );
    setLoading(false);
    setError(
      firstRejected
        ? toApiError(firstRejected.reason, "Nie udało się pobrać awarii.")
        : null,
    );
  };

  useEffect(() => {
    void loadData();
  }, []);

  const machinesById = useMemo(
    () => new Map(machines.map((machine) => [machine.id, machine] as const)),
    [machines],
  );

  const machineName = (id?: string | null) =>
    id ? (machinesById.get(id)?.name ?? "-") : "-";

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
      .filter((incident) =>
        machineId ? incident.assetId === machineId : true,
      );

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
  }, [dir, incidents, machineId, machinesById, q, severity, sortBy, status]);

  const machineOptions = useMemo(
    () =>
      machines.map((machine) => ({
        assetId: machine.id,
        assetName: machine.name,
      })),
    [machines],
  );

  const handleCreated = (incident: FailureReportDto) => {
    setIncidents((prev) => [incident, ...prev]);
  };

  const metrics = useMemo(() => {
    const openIncidents = incidents.filter(
      (incident) =>
        incident.status !== FailureStatus.Resolved &&
        incident.status !== FailureStatus.Closed,
    );

    const downtimeIncidents = incidents.filter(
      (incident) => incident.causesDowntime,
    );
    const criticalIncidents = openIncidents.filter(
      (incident) => incident.severity === FailureSeverity.Critical,
    );

    const inProgressIncidents = incidents.filter(
      (incident) => incident.status === FailureStatus.InProgress,
    );

    const resolvedIncidents = incidents.filter(
      (incident) =>
        incident.status === FailureStatus.Resolved ||
        incident.status === FailureStatus.Closed,
    );

    const totalDowntimeMinutes = incidents.reduce(
      (sum, incident) => sum + (incident.downtimeMinutes ?? 0),
      0,
    );

    return {
      openIncidents,
      downtimeIncidents,
      criticalIncidents,
      inProgressIncidents,
      resolvedIncidents,
      totalDowntimeMinutes,
    };
  }, [incidents]);

  return (
    <>
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
                    {incidents.length} zgłoszeń
                  </span>

                  {metrics.criticalIncidents.length > 0 ? (
                    <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                      {metrics.criticalIncidents.length} krytyczne
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Awarie i usterki
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Rejestr awarii, przyczyn i skutków operacyjnych. Widok
                  pokazuje priorytet, maszynę, przestój oraz szybkie przejście
                  do zlecenia, maszyny albo Kaizen.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link to="/machines" className={headerButtonClassName}>
                  Maszyny
                </Link>

                <Link to="/work-orders" className={headerButtonClassName}>
                  Zlecenia
                </Link>

                <button
                  type="button"
                  onClick={() => void loadData()}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Odśwież
                </button>

                <button
                  type="button"
                  onClick={() => setOpenAdd(true)}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Dodaj zgłoszenie
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <KpiCard
                label="Otwarte"
                value={String(
                  analytics?.openIncidentsCount ?? metrics.openIncidents.length,
                )}
                hint="Wymagają reakcji"
                tone={metrics.openIncidents.length > 0 ? "amber" : "emerald"}
              />

              <KpiCard
                label="Krytyczne"
                value={String(metrics.criticalIncidents.length)}
                hint="Najwyższy priorytet"
                tone={metrics.criticalIncidents.length > 0 ? "rose" : "slate"}
              />

              <KpiCard
                label="Przestoje"
                value={String(
                  analytics?.downtimeIncidentsCount ??
                    metrics.downtimeIncidents.length,
                )}
                hint={formatMinutes(
                  analytics?.totalDowntimeMinutes ??
                    metrics.totalDowntimeMinutes,
                )}
                tone={metrics.downtimeIncidents.length > 0 ? "rose" : "slate"}
              />

              <KpiCard
                label="MTTR"
                value={analytics?.mttrHours?.toFixed(2) ?? "-"}
                hint="Średni czas naprawy [h]"
                tone="amber"
              />

              <KpiCard
                label="MTBF"
                value={analytics?.mtbfHours?.toFixed(2) ?? "-"}
                hint="Między awariami [h]"
                tone="emerald"
              />

              <KpiCard
                label="Po filtrach"
                value={String(filtered.length)}
                hint="Widoczne zgłoszenia"
                tone="cyan"
              />
            </div>
          </section>

          {error ? <AlertBox tone="rose">{error.message}</AlertBox> : null}

          <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-3 shadow-xl shadow-slate-950/25">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1.25fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr_auto]">
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Szukaj po tytule, opisie, maszynie lub przyczynie..."
                className={inputClassName}
              />

              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value === ""
                      ? ""
                      : (Number(event.target.value) as FailureStatus),
                  )
                }
                className={inputClassName}
              >
                <option value="">Wszystkie statusy</option>
                {Object.values(FailureStatus).map((value) =>
                  typeof value === "number" ? (
                    <option key={value} value={value}>
                      {statusLabel(value as FailureStatus)}
                    </option>
                  ) : null,
                )}
              </select>

              <select
                value={severity}
                onChange={(event) =>
                  setSeverity(
                    event.target.value === ""
                      ? ""
                      : (Number(event.target.value) as FailureSeverity),
                  )
                }
                className={inputClassName}
              >
                <option value="">Wszystkie priorytety</option>
                {Object.values(FailureSeverity).map((value) =>
                  typeof value === "number" ? (
                    <option key={value} value={value}>
                      {severityLabel(value as FailureSeverity)}
                    </option>
                  ) : null,
                )}
              </select>

              <select
                value={machineId}
                onChange={(event) => setMachineId(event.target.value)}
                className={inputClassName}
              >
                <option value="">Wszystkie maszyny</option>
                {machineOptions.map((machine) => (
                  <option key={machine.assetId} value={machine.assetId}>
                    {machine.assetName}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortKey)}
                className={inputClassName}
              >
                <option value="createdAt">Data zgłoszenia</option>
                <option value="severity">Priorytet</option>
                <option value="status">Status</option>
                <option value="title">Tytuł</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  setDir((current) => (current === "asc" ? "desc" : "asc"))
                }
                className={headerButtonClassName}
              >
                {dir === "asc" ? "Rosnąco" : "Malejąco"}
              </button>

              <button
                type="button"
                onClick={reset}
                className={headerButtonClassName}
              >
                Wyczyść
              </button>
            </div>
          </section>

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(390px,0.75fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                      Rejestr zgłoszeń
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Pełna lista awarii z priorytetem, statusem, przestojem i
                      akcjami.
                    </p>
                  </div>

                  <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs font-semibold text-slate-300">
                    {filtered.length}
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3">
                {loading ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">
                    Ładowanie awarii...
                  </div>
                ) : null}

                {!loading && !error ? (
                  <div className="space-y-2">
                    {filtered.map((incident) => (
                      <IncidentCard
                        key={incident.id}
                        incident={incident}
                        machineName={machineName(incident.assetId)}
                      />
                    ))}

                    {filtered.length === 0 ? (
                      <EmptyCard text="Brak awarii pasujących do aktualnych filtrów." />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="grid min-h-0 gap-3 overflow-hidden xl:grid-rows-[1fr_1fr]">
              <SectionCard
                title="Pareto przyczyn"
                subtitle="Największe źródła strat według czasu przestoju."
              >
                <div className="space-y-3">
                  {(analytics?.pareto ?? []).slice(0, 5).map((item) => (
                    <div key={item.causeName}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                        <span className="line-clamp-1 font-semibold text-white">
                          {item.causeName}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {item.totalDowntimeMinutes} min ·{" "}
                          {Math.round(item.cumulativeShare * 100)}%
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-slate-800">
                        <div
                          className="h-2 rounded-full bg-cyan-400/70"
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
                subtitle="Kategorie źródłowe i skala ich wpływu."
              >
                <div className="space-y-2">
                  {causeCategories.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
                    >
                      <div className="text-sm font-semibold text-white">
                        {category.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {category.incidentsCount} zgłoszeń ·{" "}
                        {category.totalDowntimeMinutes} min przestoju
                      </div>
                    </div>
                  ))}

                  {causeCategories.length === 0 ? (
                    <EmptyCard text="Brak zdefiniowanych kategorii przyczyn." />
                  ) : null}
                </div>
              </SectionCard>
            </aside>
          </div>
        </div>
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

function IncidentCard({
  incident,
  machineName,
}: {
  incident: FailureReportDto;
  machineName: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_0.8fr_0.8fr_0.65fr_0.65fr_0.65fr_0.8fr_1fr]">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-semibold text-white">
            {incident.title}
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-slate-500">
            {incident.description || "Brak opisu."}
          </div>
        </div>

        <InfoCell label="Maszyna" value={machineName} />

        <InfoCell
          label="Przyczyna"
          value={incident.failureCauseCategoryName ?? "-"}
        />

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Priorytet
          </div>
          <Badge tone={severityToneLocal(incident.severity)}>
            {severityLabel(incident.severity)}
          </Badge>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Status
          </div>
          <Badge tone={statusToneLocal(incident.status)}>
            {statusLabel(incident.status)}
          </Badge>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Przestój
          </div>
          {incident.causesDowntime ? (
            <span className="text-sm font-semibold text-rose-100">
              {incident.downtimeMinutes != null
                ? `${incident.downtimeMinutes} min`
                : "Tak"}
            </span>
          ) : (
            <span className="text-sm text-slate-500">Nie</span>
          )}
        </div>

        <InfoCell
          label="Zgłoszono"
          value={formatDateTime(incident.reportedAtUtc)}
        />

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Akcje
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={`/incidents/${incident.id}`}
              className={primaryCompactButtonClassName}
            >
              Szczegóły
            </Link>

            {incident.assetId ? (
              <Link
                to={`/machines/${incident.assetId}`}
                className={compactButtonClassName}
              >
                Maszyna
              </Link>
            ) : null}

            {incident.workOrderIds[0] ? (
              <Link
                to={`/work-orders/${incident.workOrderIds[0]}`}
                className={compactButtonClassName}
              >
                Zlecenie
              </Link>
            ) : null}

            <Link
              to={buildLeanCreateLink(incident)}
              className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.10] px-2.5 py-1.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.14]"
            >
              Kaizen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="line-clamp-2 text-sm text-slate-300">{value}</div>
    </div>
  );
}

function buildLeanCreateLink(incident: FailureReportDto) {
  const params = new URLSearchParams({
    create: "1",
    title: `Kaizen po awarii: ${incident.title}`,
    description: incident.description ?? "",
    proposedAction:
      incident.preventiveAction ?? incident.correctiveAction ?? "",
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

function statusToneLocal(value: FailureStatus): Tone {
  if (value === FailureStatus.Open) return "rose";
  if (value === FailureStatus.Triaged) return "cyan";
  if (value === FailureStatus.InProgress) return "amber";
  if (value === FailureStatus.Resolved) return "emerald";

  return "slate";
}

function severityLabel(value: FailureSeverity) {
  if (value === FailureSeverity.Critical) return "Krytyczny";
  if (value === FailureSeverity.High) return "Wysoki";
  if (value === FailureSeverity.Medium) return "Średni";

  return "Niski";
}

function severityToneLocal(value: FailureSeverity): Tone {
  if (value === FailureSeverity.Critical) return "rose";
  if (value === FailureSeverity.High) return "amber";
  if (value === FailureSeverity.Medium) return "cyan";

  return "slate";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

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

function KpiCard({
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

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
        tone,
      )}`}
    >
      {children}
    </span>
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

function EmptyCard({ text }: { text: string }) {
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

const inputClassName =
  "rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";

const headerButtonClassName =
  "rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const compactButtonClassName =
  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const primaryCompactButtonClassName =
  "rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]";
