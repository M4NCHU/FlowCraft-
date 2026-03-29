import { useId } from "react";
import { FailureSeverity, FailureStatus } from "../../api/contracts";

export type SortKey = "createdAt" | "severity" | "status" | "title";
export type SortDir = "asc" | "desc";

type Props = {
  q: string;
  onQChange: (value: string) => void;
  status: "" | FailureStatus;
  onStatusChange: (value: "" | FailureStatus) => void;
  severity: "" | FailureSeverity;
  onSeverityChange: (value: "" | FailureSeverity) => void;
  machineId: "" | string;
  onMachineChange: (value: "" | string) => void;
  machines: Array<{ assetName: string; assetId: string }>;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
  dir: SortDir;
  onToggleDir: () => void;
  onReset?: () => void;
};

export function IncidentsFilters(props: Props) {
  const qId = useId();
  const statusId = useId();
  const severityId = useId();
  const machineId = useId();
  const sortId = useId();

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
            onChange={(event) => props.onQChange(event.target.value)}
            placeholder="Tytuł / opis..."
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={statusId} className="text-xs text-slate-500">
            Status
          </label>
          <select
            id={statusId}
            value={props.status}
            onChange={(event) =>
              props.onStatusChange(
                event.target.value ? (Number(event.target.value) as FailureStatus) : ""
              )
            }
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Wszystkie</option>
            <option value={FailureStatus.Open}>Nowe</option>
            <option value={FailureStatus.Triaged}>Wstępnie ocenione</option>
            <option value={FailureStatus.InProgress}>W trakcie</option>
            <option value={FailureStatus.Resolved}>Rozwiązane</option>
            <option value={FailureStatus.Closed}>Zamknięte</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={severityId} className="text-xs text-slate-500">
            Priorytet
          </label>
          <select
            id={severityId}
            value={props.severity}
            onChange={(event) =>
              props.onSeverityChange(
                event.target.value
                  ? (Number(event.target.value) as FailureSeverity)
                  : ""
              )
            }
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Wszystkie</option>
            <option value={FailureSeverity.Critical}>Krytyczny</option>
            <option value={FailureSeverity.High}>Wysoki</option>
            <option value={FailureSeverity.Medium}>Średni</option>
            <option value={FailureSeverity.Low}>Niski</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={machineId} className="text-xs text-slate-500">
            Maszyna
          </label>
          <select
            id={machineId}
            value={props.machineId}
            onChange={(event) => props.onMachineChange(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Wszystkie</option>
            {props.machines.map((machine) => (
              <option key={machine.assetId} value={machine.assetId}>
                {machine.assetName}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-xs text-slate-500">
            Sortowanie
          </label>
          <select
            id={sortId}
            value={props.sortBy}
            onChange={(event) => props.onSortByChange(event.target.value as SortKey)}
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