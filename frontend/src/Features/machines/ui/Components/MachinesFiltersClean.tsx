import { useId } from "react";
import { AssetStatus } from "../../api/contracts";

export type SortKey = "name" | "status";
export type SortDir = "asc" | "desc";
export type StatusVal = AssetStatus | "";

type Props = {
  q: string;
  onQChange: (value: string) => void;
  status: StatusVal;
  onStatusChange: (value: StatusVal) => void;
  sortBy: SortKey;
  onSortByChange: (value: SortKey) => void;
  dir: SortDir;
  onToggleDir: () => void;
  onReset?: () => void;
};

const statusLabels: Record<Exclude<StatusVal, "">, string> = {
  [AssetStatus.Available]: "Dostępna",
  [AssetStatus.InUse]: "W użyciu",
  [AssetStatus.InMaintenance]: "Serwis",
  [AssetStatus.Broken]: "Uszkodzona",
  [AssetStatus.Retired]: "Wycofana",
};

export function MachinesFiltersClean({
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
  const statusId = useId();
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
            value={q}
            onChange={(event) => onQChange(event.target.value)}
            placeholder="Nazwa, kod, model..."
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={statusId} className="text-xs text-slate-500">
            Status
          </label>
          <select
            id={statusId}
            value={status}
            onChange={(event) =>
              onStatusChange(
                event.target.value ? (Number(event.target.value) as StatusVal) : ""
              )
            }
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Wszystkie</option>
            <option value={AssetStatus.Available}>{statusLabels[AssetStatus.Available]}</option>
            <option value={AssetStatus.InUse}>{statusLabels[AssetStatus.InUse]}</option>
            <option value={AssetStatus.InMaintenance}>{statusLabels[AssetStatus.InMaintenance]}</option>
            <option value={AssetStatus.Broken}>{statusLabels[AssetStatus.Broken]}</option>
            <option value={AssetStatus.Retired}>{statusLabels[AssetStatus.Retired]}</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={sortId} className="text-xs text-slate-500">
            Sortowanie
          </label>
          <select
            id={sortId}
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as SortKey)}
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