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
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={props.q}
        onChange={(event) => props.onQChange(event.target.value)}
        placeholder="Szukaj (nazwa/kod)..."
        disabled={props.disabled}
        className="h-9 w-56 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-300"
      />

      <select
        value={props.sortBy}
        onChange={(event) => props.onSortByChange(event.target.value as HallsSortKey)}
        disabled={props.disabled}
        className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
      >
        <option value="name">Nazwa</option>
        <option value="code">Kod</option>
        <option value="areaSqMeters">Powierzchnia</option>
        <option value="sectionsCount">Sekcje</option>
      </select>

      <button
        type="button"
        onClick={props.onToggleDir}
        disabled={props.disabled}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        title="Zmień kierunek sortowania"
      >
        {props.dir === "asc" ? "Rosnąco" : "Malejąco"}
      </button>

      <button
        type="button"
        onClick={props.onReset}
        disabled={props.disabled}
        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
      >
        Reset
      </button>
    </div>
  );
}