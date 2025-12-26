import { useId } from "react";

export type SortKey = "name" | "status";
export type SortDir = "asc" | "desc";
export type StatusVal = "operational" | "maintenance" | "down" | "";

type Props = {
  q: string;
  onQChange: (v: string) => void;

  status: StatusVal;
  onStatusChange: (v: StatusVal) => void;

  sortBy: SortKey;
  onSortByChange: (v: SortKey) => void;

  dir: SortDir;
  onToggleDir: () => void;

  onReset?: () => void;
};

const STATUS_LABEL: Record<Exclude<StatusVal, "">, string> = {
  operational: "Sprawna",
  maintenance: "Przegląd/serwis",
  down: "Niesprawna",
};

export function MachinesFilters({
  q,
  onQChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  dir,
  onToggleDir,
  onReset,
}: Props) {
  const qId = useId();
  const stId = useId();
  const sId = useId();

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 md:flex-row">
        <div className="flex items-center gap-2 md:w-80">
          <label htmlFor={qId} className="text-xs text-slate-500">
            Szukaj
          </label>
          <input
            id={qId}
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Nazwa, model, status…"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={stId} className="text-xs text-slate-500">
            Status
          </label>
          <select
            id={stId}
            value={status}
            onChange={(e) => onStatusChange(e.target.value as StatusVal)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Wszystkie</option>
            <option value="operational">{STATUS_LABEL.operational}</option>
            <option value="maintenance">{STATUS_LABEL.maintenance}</option>
            <option value="down">{STATUS_LABEL.down}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={sId} className="text-xs text-slate-500">
            Sortowanie
          </label>
          <select
            id={sId}
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as any)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="name">Nazwa</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={onToggleDir}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs hover:bg-slate-50"
            title="Zmień kierunek sortowania"
          >
            {dir === "asc" ? "Rosnąco ↑" : "Malejąco ↓"}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onReset}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
        >
          Wyczyść filtry
        </button>
      </div>
    </div>
  );
}
