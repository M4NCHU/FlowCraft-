import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { OperationalStatusBadge } from "../../../shared/ui/OperationalStatusBadge";
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

export function IncidentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<FailureReportDto | null>(null);
  const [machines, setMachines] = useState<AssetListItemDto[]>([]);
  const [causeCategories, setCauseCategories] = useState<FailureCauseCategoryDto[]>([]);
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
        report.productionLossUnits != null ? String(report.productionLossUnits) : ""
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
    } catch (err) {
      setError(toApiError(err, "Nie udało się zapisać statusu awarii."));
    } finally {
      setSaving(false);
    }
  };

  const machine = useMemo(
    () => machines.find((item) => item.id === incident?.assetId) ?? null,
    [incident?.assetId, machines]
  );

  const leanLink = useMemo(() => {
    if (!incident) return "/lean";

    const params = new URLSearchParams({
      create: "1",
      title: `Kaizen po awarii: ${incident.title}`,
      description: incident.description,
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
    return <div className="rounded-xl bg-white p-6 shadow">Ładowanie...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
        {error.message}
      </div>
    );
  }

  if (!incident) {
    return <div>Nie znaleziono zgłoszenia.</div>;
  }

  return (
    <>
      <PageHeader
        title="Szczegóły zgłoszenia"
        extra={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Wróć
            </button>
            <button
              onClick={() => setOpenSchedule(true)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Zaplanuj serwis
            </button>
            <Link
              to={leanLink}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj kaizen
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl bg-white p-5 shadow">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{incident.title}</h2>
              <div className="mt-2 text-sm text-slate-600">{incident.description}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <OperationalStatusBadge
                label={severityLabels[incident.severity]}
                tone={incident.severity === FailureSeverity.Critical ? "danger" : incident.severity === FailureSeverity.High ? "warning" : "info"}
              />
              <OperationalStatusBadge
                label={statusOptions.find((option) => option.value === status)?.label ?? "Status"}
                tone={status === FailureStatus.Resolved || status === FailureStatus.Closed ? "success" : status === FailureStatus.InProgress ? "warning" : status === FailureStatus.Triaged ? "info" : "danger"}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Detail
              label="Maszyna"
              value={
                machine ? (
                  <Link to={`/machines/${machine.id}`} className="text-sky-700 hover:underline">
                    {machine.name}
                  </Link>
                ) : (
                  "-"
                )
              }
            />
            <Detail label="Zgłoszono" value={formatDateTime(incident.reportedAtUtc)} />
            <Detail label="Przestój" value={incident.causesDowntime ? "Tak" : "Nie"} />
            <Detail label="Start przestoju" value={formatDateTime(incident.downtimeStartedAtUtc)} />
            <Detail label="Koniec przestoju" value={formatDateTime(incident.downtimeEndedAtUtc)} />
            <Detail label="Łączny przestój" value={incident.downtimeMinutes != null ? `${incident.downtimeMinutes} min` : "-"} />
            <Detail label="Strata produkcyjna" value={incident.productionLossUnits != null ? String(incident.productionLossUnits) : "-"} />
            <Detail label="Powiązane zlecenia" value={String(incident.workOrderIds.length)} />
          </div>

          <div className="mt-6 space-y-4">
            <TextPanel title="Przyczyna źródłowa" value={rootCause || "Brak opisu."} />
            <TextPanel title="Działanie korygujące" value={correctiveAction || "Brak opisu."} />
            <TextPanel title="Działanie zapobiegawcze" value={preventiveAction || "Brak opisu."} />
            <TextPanel title="Podsumowanie rozwiązania" value={resolutionSummary || "Brak podsumowania."} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {machine ? (
              <Link
                to={`/machines/${machine.id}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Szczegóły maszyny
              </Link>
            ) : null}
            {machine ? (
              <Link
                to={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Przeglądy maszyny
              </Link>
            ) : null}
            {incident.workOrderIds.map((workOrderId) => (
              <Link
                key={workOrderId}
                to={`/work-orders/${workOrderId}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Zlecenie {workOrderId.slice(0, 8)}
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-xl bg-white p-5 shadow">
          <div className="text-sm font-semibold text-slate-900">Domknięcie awarii</div>
          <div className="mt-4 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(Number(event.target.value) as FailureStatus)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Kategoria przyczyny</span>
              <select
                value={failureCauseCategoryId}
                onChange={(event) => setFailureCauseCategoryId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Nieokreślona</option>
                {causeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Przyczyna źródłowa</span>
              <textarea
                rows={3}
                value={rootCause}
                onChange={(event) => setRootCause(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Działanie korygujące</span>
              <textarea
                rows={3}
                value={correctiveAction}
                onChange={(event) => setCorrectiveAction(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Działanie zapobiegawcze</span>
              <textarea
                rows={3}
                value={preventiveAction}
                onChange={(event) => setPreventiveAction(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Koniec przestoju</span>
                <input
                  type="datetime-local"
                  value={downtimeEndedAtUtc}
                  onChange={(event) => setDowntimeEndedAtUtc(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Strata produkcyjna</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productionLossUnits}
                  onChange={(event) => setProductionLossUnits(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Podsumowanie rozwiązania</span>
              <textarea
                rows={4}
                value={resolutionSummary}
                onChange={(event) => setResolutionSummary(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            onClick={() => void handleSaveStatus()}
            disabled={saving}
            className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Zapisywanie..." : "Zapisz status i działania"}
          </button>

          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            <div>ID: <span className="font-mono">{incident.id}</span></div>
            <div className="mt-1">Powiązanych zleceń: {incident.workOrderIds.length}</div>
          </div>
        </aside>
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

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}

function TextPanel({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{value}</div>
    </div>
  );
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
