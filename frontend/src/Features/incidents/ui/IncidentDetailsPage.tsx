import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { assetsApi } from "../../machines/api/assetsApi";
import type { AssetListItemDto } from "../../machines/api/contracts";
import {
  FailureSeverity,
  FailureStatus,
  type FailureCauseCategoryDto,
  type FailureReportDto,
} from "../api/contracts";
import { failureReportsApi } from "../api/failureReportsApi";
import { ScheduleWorkModal } from "./components/ScheduleWorkModal";

const statusOptions = [
  { value: FailureStatus.Open, label: "Nowe" },
  { value: FailureStatus.Triaged, label: "Wstępnie ocenione" },
  { value: FailureStatus.InProgress, label: "W trakcie" },
  { value: FailureStatus.Resolved, label: "Rozwiązane" },
  { value: FailureStatus.Closed, label: "Zamknięte" },
];

const severityLabels: Record<FailureSeverity, string> = {
  [FailureSeverity.Low]: "Niski",
  [FailureSeverity.Medium]: "Średni",
  [FailureSeverity.High]: "Wysoki",
  [FailureSeverity.Critical]: "Krytyczny",
};

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

export function IncidentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<FailureReportDto | null>(null);
  const [machines, setMachines] = useState<AssetListItemDto[]>([]);
  const [causeCategories, setCauseCategories] = useState<
    FailureCauseCategoryDto[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<FailureStatus>(FailureStatus.Open);
  const [failureCauseCategoryId, setFailureCauseCategoryId] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [downtimeEndedAtUtc, setDowntimeEndedAtUtc] = useState("");
  const [productionLossUnits, setProductionLossUnits] = useState("");
  const [openSchedule, setOpenSchedule] = useState(false);

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [report, assets, categories] = await Promise.all([
        failureReportsApi.getById(id),
        assetsApi.list(),
        failureReportsApi.listCauseCategories(true),
      ]);

      setIncident(report);
      setStatus(report.status);
      setFailureCauseCategoryId(report.failureCauseCategoryId ?? "");
      setRootCause(report.rootCause ?? "");
      setCorrectiveAction(report.correctiveAction ?? "");
      setPreventiveAction(report.preventiveAction ?? "");
      setResolutionSummary(report.resolutionSummary ?? "");
      setDowntimeEndedAtUtc(toLocalDateTime(report.downtimeEndedAtUtc));
      setProductionLossUnits(
        report.productionLossUnits != null
          ? String(report.productionLossUnits)
          : "",
      );
      setMachines(assets ?? []);
      setCauseCategories(categories ?? []);
    } catch (err) {
      setError(toApiError(err, "Nie udało się pobrać szczegółów zgłoszenia."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const handleSaveStatus = async () => {
    if (!incident) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await failureReportsApi.setStatus(incident.id, {
        status,
        resolutionSummary: resolutionSummary.trim() || null,
        rootCause: rootCause.trim() || null,
        correctiveAction: correctiveAction.trim() || null,
        preventiveAction: preventiveAction.trim() || null,
        failureCauseCategoryId: failureCauseCategoryId || null,
        downtimeEndedAtUtc: downtimeEndedAtUtc
          ? new Date(downtimeEndedAtUtc).toISOString()
          : null,
        productionLossUnits: productionLossUnits.trim()
          ? Number(productionLossUnits)
          : null,
      });

      setIncident(updated);
      setStatus(updated.status);
      setFailureCauseCategoryId(updated.failureCauseCategoryId ?? "");
      setRootCause(updated.rootCause ?? "");
      setCorrectiveAction(updated.correctiveAction ?? "");
      setPreventiveAction(updated.preventiveAction ?? "");
      setResolutionSummary(updated.resolutionSummary ?? "");
      setDowntimeEndedAtUtc(toLocalDateTime(updated.downtimeEndedAtUtc));
      setProductionLossUnits(
        updated.productionLossUnits != null
          ? String(updated.productionLossUnits)
          : "",
      );
    } catch (err) {
      setError(toApiError(err, "Nie udało się zapisać statusu awarii."));
    } finally {
      setSaving(false);
    }
  };

  const machine = useMemo(
    () => machines.find((item) => item.id === incident?.assetId) ?? null,
    [incident?.assetId, machines],
  );

  const selectedCauseCategory = useMemo(
    () =>
      causeCategories.find(
        (category) => category.id === failureCauseCategoryId,
      ) ?? null,
    [causeCategories, failureCauseCategoryId],
  );

  const leanLink = useMemo(() => {
    if (!incident) return "/lean";

    const params = new URLSearchParams({
      create: "1",
      title: `Kaizen po awarii: ${incident.title}`,
      description: incident.description ?? "",
      proposedAction: preventiveAction || correctiveAction,
      notes: [
        `Źródło: awaria ${incident.title}`,
        rootCause ? `Przyczyna źródłowa: ${rootCause}` : null,
        machine ? `Maszyna: ${machine.name}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return `/lean?${params.toString()}`;
  }, [correctiveAction, incident, machine, preventiveAction, rootCause]);

  if (loading) {
    return (
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-sm text-slate-400">
          Ładowanie szczegółów zgłoszenia...
        </div>
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] p-6 text-sm text-rose-100">
          {error.message}
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">
          Nie znaleziono zgłoszenia.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Szczegóły awarii
                  </span>

                  <Badge tone={severityTone(incident.severity)}>
                    {severityLabels[incident.severity]}
                  </Badge>

                  <Badge tone={statusTone(status)}>
                    {statusOptions.find((option) => option.value === status)
                      ?.label ?? "Status"}
                  </Badge>

                  {incident.causesDowntime ? (
                    <Badge tone="rose">
                      Przestój
                      {incident.downtimeMinutes != null
                        ? ` · ${incident.downtimeMinutes} min`
                        : ""}
                    </Badge>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  {incident.title}
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Pełny zapis awarii z przyczyną, działaniami, skutkami
                  produkcyjnymi oraz szybkim przejściem do serwisu albo tematu
                  Kaizen.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className={headerButtonClassName}
                >
                  Wróć
                </button>

                <button
                  type="button"
                  onClick={() => setOpenSchedule(true)}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Zaplanuj serwis
                </button>

                <Link
                  to={leanLink}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Dodaj Kaizen
                </Link>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <KpiCard
                label="Maszyna"
                value={machine?.name ?? "-"}
                hint={machine ? "Powiązany zasób" : "Brak maszyny"}
                tone={machine ? "cyan" : "slate"}
              />

              <KpiCard
                label="Status"
                value={
                  statusOptions.find((option) => option.value === status)
                    ?.label ?? "-"
                }
                hint="Aktualny etap"
                tone={statusTone(status)}
              />

              <KpiCard
                label="Priorytet"
                value={severityLabels[incident.severity]}
                hint="Waga zgłoszenia"
                tone={severityTone(incident.severity)}
              />

              <KpiCard
                label="Przestój"
                value={
                  incident.causesDowntime
                    ? incident.downtimeMinutes != null
                      ? `${incident.downtimeMinutes} min`
                      : "Tak"
                    : "Nie"
                }
                hint="Wpływ na produkcję"
                tone={incident.causesDowntime ? "rose" : "emerald"}
              />

              <KpiCard
                label="Strata"
                value={
                  incident.productionLossUnits != null
                    ? String(incident.productionLossUnits)
                    : "-"
                }
                hint="Jednostki produkcyjne"
                tone={incident.productionLossUnits ? "amber" : "slate"}
              />

              <KpiCard
                label="Zlecenia"
                value={String(incident.workOrderIds.length)}
                hint="Powiązane prace"
                tone={incident.workOrderIds.length > 0 ? "violet" : "slate"}
              />
            </div>
          </section>

          {error ? <AlertBox tone="rose">{error.message}</AlertBox> : null}

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                      Opis i analiza zgłoszenia
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Dane zgłoszenia, przestój, przyczyny i powiązane obiekty.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {machine ? (
                      <Link
                        to={`/machines/${machine.id}`}
                        className={primaryCompactButtonClassName}
                      >
                        Maszyna
                      </Link>
                    ) : null}

                    {machine ? (
                      <Link
                        to={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
                        className={compactButtonClassName}
                      >
                        Przeglądy
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3">
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Opis zgłoszenia
                    </div>

                    <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                      {incident.description || "Brak opisu."}
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <Detail
                      label="Maszyna"
                      value={
                        machine ? (
                          <Link
                            to={`/machines/${machine.id}`}
                            className="text-cyan-100 hover:underline"
                          >
                            {machine.name}
                          </Link>
                        ) : (
                          "-"
                        )
                      }
                    />

                    <Detail
                      label="Zgłoszono"
                      value={formatDateTime(incident.reportedAtUtc)}
                    />

                    <Detail
                      label="Przestój"
                      value={incident.causesDowntime ? "Tak" : "Nie"}
                      tone={incident.causesDowntime ? "rose" : "emerald"}
                    />

                    <Detail
                      label="Kategoria przyczyny"
                      value={
                        selectedCauseCategory?.name ??
                        incident.failureCauseCategoryName ??
                        "-"
                      }
                      tone={selectedCauseCategory ? "cyan" : "slate"}
                    />

                    <Detail
                      label="Start przestoju"
                      value={formatDateTime(incident.downtimeStartedAtUtc)}
                    />

                    <Detail
                      label="Koniec przestoju"
                      value={formatDateTime(incident.downtimeEndedAtUtc)}
                    />

                    <Detail
                      label="Łączny przestój"
                      value={
                        incident.downtimeMinutes != null
                          ? `${incident.downtimeMinutes} min`
                          : "-"
                      }
                      tone={incident.downtimeMinutes ? "rose" : "slate"}
                    />

                    <Detail
                      label="Strata produkcyjna"
                      value={
                        incident.productionLossUnits != null
                          ? String(incident.productionLossUnits)
                          : "-"
                      }
                      tone={incident.productionLossUnits ? "amber" : "slate"}
                    />
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    <TextPanel
                      title="Przyczyna źródłowa"
                      value={rootCause || "Brak opisu."}
                    />

                    <TextPanel
                      title="Działanie korygujące"
                      value={correctiveAction || "Brak opisu."}
                    />

                    <TextPanel
                      title="Działanie zapobiegawcze"
                      value={preventiveAction || "Brak opisu."}
                    />

                    <TextPanel
                      title="Podsumowanie rozwiązania"
                      value={resolutionSummary || "Brak podsumowania."}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                    <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Powiązania
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {machine ? (
                        <Link
                          to={`/machines/${machine.id}`}
                          className={primaryCompactButtonClassName}
                        >
                          Szczegóły maszyny
                        </Link>
                      ) : null}

                      {machine ? (
                        <Link
                          to={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
                          className={compactButtonClassName}
                        >
                          Przeglądy maszyny
                        </Link>
                      ) : null}

                      {incident.workOrderIds.map((workOrderId) => (
                        <Link
                          key={workOrderId}
                          to={`/work-orders/${workOrderId}`}
                          className={compactButtonClassName}
                        >
                          Zlecenie {workOrderId.slice(0, 8)}
                        </Link>
                      ))}

                      {incident.workOrderIds.length === 0 ? (
                        <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-500">
                          Brak powiązanych zleceń
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                  Domknięcie awarii
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Uzupełnij status, przyczynę, działania i skutki produkcyjne.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3">
                <div className="space-y-3">
                  <Field label="Status">
                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(Number(event.target.value) as FailureStatus)
                      }
                      className={inputClassName}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Kategoria przyczyny">
                    <select
                      value={failureCauseCategoryId}
                      onChange={(event) =>
                        setFailureCauseCategoryId(event.target.value)
                      }
                      className={inputClassName}
                    >
                      <option value="">Nieokreślona</option>
                      {causeCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Przyczyna źródłowa">
                    <textarea
                      rows={3}
                      value={rootCause}
                      onChange={(event) => setRootCause(event.target.value)}
                      className={textareaClassName}
                    />
                  </Field>

                  <Field label="Działanie korygujące">
                    <textarea
                      rows={3}
                      value={correctiveAction}
                      onChange={(event) =>
                        setCorrectiveAction(event.target.value)
                      }
                      className={textareaClassName}
                    />
                  </Field>

                  <Field label="Działanie zapobiegawcze">
                    <textarea
                      rows={3}
                      value={preventiveAction}
                      onChange={(event) =>
                        setPreventiveAction(event.target.value)
                      }
                      className={textareaClassName}
                    />
                  </Field>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Koniec przestoju">
                      <input
                        type="datetime-local"
                        value={downtimeEndedAtUtc}
                        onChange={(event) =>
                          setDowntimeEndedAtUtc(event.target.value)
                        }
                        className={inputClassName}
                      />
                    </Field>

                    <Field label="Strata produkcyjna">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productionLossUnits}
                        onChange={(event) =>
                          setProductionLossUnits(event.target.value)
                        }
                        className={inputClassName}
                      />
                    </Field>
                  </div>

                  <Field label="Podsumowanie rozwiązania">
                    <textarea
                      rows={4}
                      value={resolutionSummary}
                      onChange={(event) =>
                        setResolutionSummary(event.target.value)
                      }
                      className={textareaClassName}
                    />
                  </Field>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 p-3">
                <button
                  type="button"
                  onClick={() => void handleSaveStatus()}
                  disabled={saving}
                  className="w-full rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Zapisywanie..." : "Zapisz status i działania"}
                </button>

                <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
                  <div>
                    ID:{" "}
                    <span className="font-mono text-slate-300">
                      {incident.id}
                    </span>
                  </div>

                  <div className="mt-1">
                    Powiązanych zleceń: {incident.workOrderIds.length}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <ScheduleWorkModal
        incident={incident}
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        onScheduled={loadData}
      />
    </>
  );
}

function Detail({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>

      <div className="mt-1 line-clamp-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function TextPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>

      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
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

function severityTone(value: FailureSeverity): Tone {
  if (value === FailureSeverity.Critical) return "rose";
  if (value === FailureSeverity.High) return "amber";
  if (value === FailureSeverity.Medium) return "cyan";

  return "slate";
}

function statusTone(value: FailureStatus): Tone {
  if (value === FailureStatus.Open) return "rose";
  if (value === FailureStatus.Triaged) return "cyan";
  if (value === FailureStatus.InProgress) return "amber";
  if (value === FailureStatus.Resolved) return "emerald";

  return "slate";
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

const primaryCompactButtonClassName =
  "rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]";

const inputClassName =
  "rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";

const textareaClassName =
  "min-h-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";

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

function toLocalDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
