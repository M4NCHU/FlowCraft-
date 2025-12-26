import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { useIncidentsStore } from "../../../entities/incidents/model/useIncidentsStore";
import type {
  IncidentSeverity,
  IncidentStatus,
} from "../../../entities/incidents/model/useIncidentsStore";
import { useMachinesStore } from "../../../entities/machines/model/useMachinesStore";
import {
  IncidentsFilters,
  type SortDir,
  type SortKey,
} from "./components/IncidentsFilters";
import { AddIncidentModal } from "./components/AddIncidentModal";

const statusPill: Record<IncidentStatus, string> = {
  open: "bg-rose-50 text-rose-700 border-rose-200",
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const severityPill: Record<IncidentSeverity, string> = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
};

export function IncidentsPage() {
  const incidents = useIncidentsStore((s) => s.incidents);
  const machines = useMachinesStore((s) => s.machines);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | IncidentStatus>("");
  const [severity, setSeverity] = useState<"" | IncidentSeverity>("");
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

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();

    let base = incidents.slice();

    if (norm) {
      base = base.filter(
        (i) =>
          i.title.toLowerCase().includes(norm) ||
          (i.description ?? "").toLowerCase().includes(norm)
      );
    }
    if (status) base = base.filter((i) => i.status === status);
    if (severity) base = base.filter((i) => i.severity === severity);
    if (machineId) base = base.filter((i) => i.machineId === machineId);

    base.sort((a, b) => {
      const val = (k: SortKey, x: typeof a) => {
        if (k === "createdAt") return x.createdAt;
        if (k === "severity") return x.severity;
        if (k === "status") return x.status;
        return x.title.toLowerCase();
      };
      const av = val(sortBy, a);
      const bv = val(sortBy, b);
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });

    return base;
  }, [incidents, q, status, severity, machineId, sortBy, dir]);

  const machineName = (id?: string) =>
    machines.find((m) => m.id === id)?.name ?? "—";

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
              sortBy={sortBy}
              onSortByChange={setSortBy}
              dir={dir}
              onToggleDir={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
              onReset={reset}
            />
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj zgłoszenie
            </button>
          </div>
        }
      />

      <div className="rounded-xl bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Tytuł</th>
              <th className="py-2">Maszyna</th>
              <th className="py-2">Priorytet</th>
              <th className="py-2">Status</th>
              <th className="py-2">Zgłoszono</th>
              <th className="py-2 w-40">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="py-2">
                  <Link
                    to={`/incidents/${i.id}`}
                    className="text-sky-700 hover:underline"
                  >
                    {i.title}
                  </Link>
                </td>
                <td className="py-2">{machineName(i.machineId)}</td>
                <td className="py-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      severityPill[i.severity]
                    }`}
                  >
                    {i.severity === "high"
                      ? "Wysoki"
                      : i.severity === "medium"
                      ? "Średni"
                      : "Niski"}
                  </span>
                </td>
                <td className="py-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      statusPill[i.status]
                    }`}
                  >
                    {i.status === "open"
                      ? "Nowe"
                      : i.status === "in_progress"
                      ? "W trakcie"
                      : "Zamknięte"}
                  </span>
                </td>
                <td className="py-2">
                  {new Date(i.createdAt).toLocaleString()}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Link
                      to={`/incidents/${i.id}`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Szczegóły
                    </Link>
                    <Link
                      to={`/editor?incidentId=${i.id}`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Pokaż na planie
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  Brak wyników.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddIncidentModal open={openAdd} onClose={() => setOpenAdd(false)} />
    </>
  );
}
