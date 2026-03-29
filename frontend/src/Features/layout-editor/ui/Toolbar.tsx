import { Link } from "react-router-dom";

interface ToolbarProps {
  hallName?: string;
  hallCode?: string;
  dirtyCount: number;
  saving: boolean;
  loading: boolean;
  onReload: () => void;
  onSave: () => void;
}

export function Toolbar({
  hallName,
  hallCode,
  dirtyCount,
  saving,
  loading,
  onReload,
  onSave,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Edytor layoutu
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-900">
          {hallName ? `${hallName}${hallCode ? ` (${hallCode})` : ""}` : "Brak wybranej hali"}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {dirtyCount > 0
            ? `Masz zapisane lokalnie ${dirtyCount} zmian do wysłania.`
            : "Layout jest zsynchronizowany z aktualnymi danymi hali i rozmieszczeń maszyn."}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/halls"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Hale
        </Link>
        <Link
          to="/machines"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Maszyny
        </Link>
        <button
          type="button"
          onClick={onReload}
          disabled={loading || saving}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? "Ładowanie..." : "Odśwież dane"}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || loading}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Zapisywanie..." : "Zapisz zmiany"}
        </button>
      </div>
    </div>
  );
}
