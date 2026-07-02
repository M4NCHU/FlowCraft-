export type HallsSortKey = "name" | "code" | "areaSqMeters" | "sectionsCount";
export type SortDir = "asc" | "desc";

type Props = {
  q: string;
  onQChange: (value: string) => void;
  sortBy: HallsSortKey;
  onSortByChange: (value: HallsSortKey) => void;
  dir: SortDir;
  onToggleDir: () => void;
  onReset: () => void;
  disabled?: boolean;
};

export function HallsFilters(props: Props) {
  return (
    <div className="grid w-full gap-2 lg:grid-cols-[minmax(16rem,1fr)_13rem_auto_auto]">
      <input
        value={props.q}
        onChange={(event) => props.onQChange(event.target.value)}
        placeholder="Szukaj hali po nazwie lub kodzie..."
        disabled={props.disabled}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-300"
      />

      <select
        value={props.sortBy}
        onChange={(event) => props.onSortByChange(event.target.value as HallsSortKey)}
        disabled={props.disabled}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800"
      >
        <option value="name">Sortuj: nazwa</option>
        <option value="code">Sortuj: kod</option>
        <option value="areaSqMeters">Sortuj: powierzchnia</option>
        <option value="sectionsCount">Sortuj: sekcje</option>
      </select>

      <button
        type="button"
        onClick={props.onToggleDir}
        disabled={props.disabled}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
        title="Zmien kierunek sortowania"
      >
        {props.dir === "asc" ? "Rosnaco" : "Malejaco"}
      </button>

      <button
        type="button"
        onClick={props.onReset}
        disabled={props.disabled}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Reset
      </button>
    </div>
  );
}
