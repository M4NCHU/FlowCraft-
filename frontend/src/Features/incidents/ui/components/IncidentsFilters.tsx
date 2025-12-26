import { useId } from "react";
import type {
  IncidentSeverity,
  IncidentStatus,
} from "../../../../entities/incidents/model/useIncidentsStore";
import { useMachinesStore } from "../../../../entities/machines/model/useMachinesStore";

export type SortKey = "createdAt" | "severity" | "status" | "title";
export type SortDir = "asc" | "desc";

type Props = {
  q: string;
  onQChange: (v: string) => void;

  status: "" | IncidentStatus;
  onStatusChange: (v: "" | IncidentStatus) => void;

  severity: "" | IncidentSeverity;
  onSeverityChange: (v: "" | IncidentSeverity) => void;

  machineId: "" | string;
  onMachineChange: (v: "" | string) => void;

  sortBy: SortKey;
  onSortByChange: (v: SortKey) => void;

  dir: SortDir;
  onToggleDir: () => void;

  onReset?: () => void;
};

export function IncidentsFilters(props: Props) {
  const qId = useId();
  const stId = useId();
  const svId = useId();
  const mcId = useId();
  const soId = useId();

  const machines = useMachinesStore((s) => s.machines);

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 md:flex-row">
        <div className="flex items-center gap-2 md:w-80">
          <label htmlFor={qId} className="text-xs text-slate-500">
            Szukaj
          </label>
          <input
            id={qId}
            value={props.q}
            onChange={(e) => props.onQChange(e.target.value)}
            placeholder="Tytuł/Opis…"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={stId} className="text-xs text-slate-500">
            Status
          </label>
          <select
            id={stId}
            value={props.status}
            onChange={(e) => props.onStatusChange(e.target.value as any)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Wszystkie</option>
            <option value="open">Nowe</option>
            <option value="in_progress">W trakcie</option>
            <option value="resolved">Zamknięte</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={svId} className="text-xs text-slate-500">
            Priorytet
          </label>
          <select
            id={svId}
            value={props.severity}
            onChange={(e) => props.onSeverityChange(e.target.value as any)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Wszystkie</option>
            <option value="high">Wysoki</option>
            <option value="medium">Średni</option>
            <option value="low">Niski</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={mcId} className="text-xs text-slate-500">
            Maszyna
          </label>
          <select
            id={mcId}
            value={props.machineId}
            onChange={(e) => props.onMachineChange(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Wszystkie</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={soId} className="text-xs text-slate-500">
            Sortowanie
          </label>
          <select
            id={soId}
            value={props.sortBy}
            onChange={(e) => props.onSortByChange(e.target.value as any)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="createdAt">Data zgłoszenia</option>
            <option value="severity">Priorytet</option>
            <option value="status">Status</option>
            <option value="title">Tytuł</option>
          </select>
          <button
            onClick={props.onToggleDir}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs hover:bg-slate-50"
          >
            {props.dir === "asc" ? "Rosnąco ↑" : "Malejąco ↓"}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={props.onReset}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
        >
          Wyczyść filtry
        </button>
      </div>
    </div>
  );
}
