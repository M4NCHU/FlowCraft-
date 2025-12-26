import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { useIncidentsStore } from "../../../entities/incidents/model/useIncidentsStore";
import { useMachinesStore } from "../../../entities/machines/model/useMachinesStore";
import type {
  IncidentStatus,
  IncidentSeverity,
} from "../../../entities/incidents/model/useIncidentsStore";
import { IncidentTabs } from "./components/IncidentTabs";
import { CommentsPanel } from "./components/CommentsPanel";
import { TimelinePanel } from "./components/TimelinePanel";
import { AttachmentsPanel } from "./components/AttachmentsPanel";
import { ScheduleWorkModal } from "./components/ScheduleWorkModal";

const statusLabel: Record<IncidentStatus, string> = {
  open: "Nowe",
  in_progress: "W trakcie",
  resolved: "Zamknięte",
};
const statusPill: Record<IncidentStatus, string> = {
  open: "bg-rose-50 text-rose-700 border-rose-200",
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const severityLabel: Record<IncidentSeverity, string> = {
  high: "Wysoki",
  medium: "Średni",
  low: "Niski",
};
const severityPill: Record<IncidentSeverity, string> = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
};

export function IncidentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const incidents = useIncidentsStore((s) => s.incidents);
  const updateStatus = useIncidentsStore((s) => s.updateStatus);
  const assignTo = useIncidentsStore((s) => s.assignTo);
  const resolveIncident = useIncidentsStore((s) => s.resolve);

  const machines = useMachinesStore((s) => s.machines);

  const incident = useMemo(
    () => incidents.find((i) => i.id === id),
    [incidents, id]
  );
  const [newStatus, setNewStatus] = useState<IncidentStatus>(
    incident?.status ?? "open"
  );
  const [assignee, setAssignee] = useState<string>(incident?.assignee ?? "");
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [costActual, setCostActual] = useState<string>("");

  const [openSchedule, setOpenSchedule] = useState(false);

  if (!incident) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">Nie znaleziono zgłoszenia.</p>
        <div className="mt-4">
          <button
            onClick={() => navigate(-1)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            Wróć
          </button>
        </div>
      </div>
    );
  }

  const machineName =
    machines.find((m) => m.id === incident.machineId)?.name ?? "—";

  const applyStatus = () => {
    if (newStatus !== incident.status) updateStatus(incident.id, newStatus);
    if (assignee !== (incident.assignee ?? "")) assignTo(incident.id, assignee);
  };

  const timeToDue = incident.dueAt
    ? new Date(incident.dueAt).getTime() - Date.now()
    : undefined;
  const slaState =
    timeToDue == null
      ? "brak terminu"
      : timeToDue < 0
      ? "po terminie"
      : timeToDue < 12 * 3600 * 1000
      ? "pilne"
      : "w terminie";

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
            <Link
              to={`/editor?incidentId=${incident.id}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Pokaż na planie
            </Link>
            <button
              onClick={() => setOpenSchedule(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Zaplanuj serwis
            </button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* KARTA GŁÓWNA */}
        <section className="md:col-span-2 rounded-xl bg-white p-5 shadow">
          <div className="mb-2 flex items-start justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {incident.title}
            </h2>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 text-sm">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${
                severityPill[incident.severity]
              }`}
            >
              Priorytet: {severityLabel[incident.severity]}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${
                statusPill[incident.status]
              }`}
            >
              Status: {statusLabel[incident.status]}
            </span>
            {incident.tags && incident.tags.length > 0 && (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                Tagi: {incident.tags.join(", ")}
              </span>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="text-slate-500">Maszyna</dt>
              <dd className="text-slate-900">
                {incident.machineId ? (
                  <Link
                    to={`/machines/${incident.machineId}`}
                    className="text-sky-700 hover:underline"
                  >
                    {machineName}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Zgłoszone</dt>
              <dd className="text-slate-900">
                {new Date(incident.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Zgłaszający</dt>
              <dd className="text-slate-900">{incident.reportedBy ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Przypisane do</dt>
              <dd className="text-slate-900">{incident.assignee ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Termin (SLA)</dt>
              <dd className="text-slate-900">
                {incident.dueAt
                  ? new Date(incident.dueAt).toLocaleString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Koszt planowany</dt>
              <dd className="text-slate-900">
                {incident.costEstimate != null
                  ? `${incident.costEstimate.toFixed(2)} PLN`
                  : "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <IncidentTabs
              initial="details"
              tabs={[
                {
                  key: "details",
                  label: "Opis",
                  content: (
                    <p className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                      {incident.description ?? "Brak opisu."}
                    </p>
                  ),
                },
                {
                  key: "comments",
                  label: "Komentarze",
                  content: <CommentsPanel incidentId={incident.id} />,
                },
                {
                  key: "timeline",
                  label: "Oś czasu",
                  content: <TimelinePanel incidentId={incident.id} />,
                },
                {
                  key: "attachments",
                  label: "Załączniki",
                  content: <AttachmentsPanel incidentId={incident.id} />,
                },
              ]}
            />
          </div>
        </section>

        {/* PRAWY PANEL: AKCJE / SLA */}
        <aside className="rounded-xl bg-white p-5 shadow">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Akcje</h3>

          <div className="space-y-3">
            <label className="text-xs text-slate-500">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as IncidentStatus)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="open">Nowe</option>
              <option value="in_progress">W trakcie</option>
              <option value="resolved">Zamknięte</option>
            </select>

            <label className="text-xs text-slate-500">Przypisz do</label>
            <input
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="np. tech01"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />

            <button
              onClick={applyStatus}
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Zapisz zmiany
            </button>

            <div className="mt-4 border-t pt-4">
              <h4 className="mb-2 text-sm font-semibold">Zamknij zgłoszenie</h4>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                rows={3}
                placeholder="Opis wykonanej naprawy…"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costActual}
                  onChange={(e) => setCostActual(e.target.value)}
                  placeholder="Koszt faktyczny (PLN)"
                  className="w-1/2 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
                <button
                  onClick={() =>
                    resolveIncident(
                      incident.id,
                      resolutionNote || undefined,
                      costActual ? Number(costActual) : undefined
                    )
                  }
                  className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">SLA</h3>
            <div
              className={[
                "rounded-md px-3 py-2 text-sm",
                slaState === "po terminie"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : slaState === "pilne"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : slaState === "w terminie"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-50 text-slate-700 border border-slate-200",
              ].join(" ")}
            >
              Status SLA: {slaState}
            </div>
          </div>

          <div className="mt-8 border-t pt-4 text-xs text-slate-500">
            ID: <span className="font-mono">{incident.id}</span>
          </div>
        </aside>
      </div>

      <ScheduleWorkModal
        incidentId={incident.id}
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
      />
    </>
  );
}
