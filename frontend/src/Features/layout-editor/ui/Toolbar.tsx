import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface ToolbarProps {
  hallName?: string;
  hallCode?: string;
  dirtyCount: number;
  saving: boolean;
  loading: boolean;
  canUndo: boolean;
  canRedo: boolean;
  totalMachines: number;
  activeIncidents: number;
  openWorkOrders: number;
  sectionsRequiringAttention: number;
  machinesWithRealFootprint: number;
  validationErrorsCount: number;
  validationWarningsCount: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  focusMode: boolean;
  attentionMode: boolean;
  showLabels: boolean;
  showLegend: boolean;
  showOverview: boolean;
  diagnosticsOpen: boolean;
  controls?: ReactNode;
  onReload: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onToggleFocusMode: () => void;
  onToggleAttentionMode: () => void;
  onToggleLabels: () => void;
  onToggleLegend: () => void;
  onToggleOverview: () => void;
  onToggleDiagnostics: () => void;
}

export function Toolbar({
  hallName,
  hallCode,
  dirtyCount,
  saving,
  loading,
  canUndo,
  canRedo,
  totalMachines,
  activeIncidents,
  openWorkOrders,
  sectionsRequiringAttention,
  machinesWithRealFootprint,
  validationErrorsCount,
  validationWarningsCount,
  leftPanelCollapsed,
  rightPanelCollapsed,
  focusMode,
  attentionMode,
  showLabels,
  showLegend,
  showOverview,
  diagnosticsOpen,
  controls,
  onReload,
  onSave,
  onUndo,
  onRedo,
  onToggleLeftPanel,
  onToggleRightPanel,
  onToggleFocusMode,
  onToggleAttentionMode,
  onToggleLabels,
  onToggleLegend,
  onToggleOverview,
  onToggleDiagnostics,
}: ToolbarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-[15rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600">
              Edytor hali
            </span>
            <StatusBadge
              tone={dirtyCount > 0 ? "amber" : "emerald"}
              label={
                dirtyCount > 0
                  ? `${dirtyCount} zmian lokalnych`
                  : "Layout zsynchronizowany"
              }
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-lg font-semibold text-slate-950">
              {hallName
                ? `${hallName}${hallCode ? ` (${hallCode})` : ""}`
                : "Brak wybranej hali"}
            </h1>
            <span className="text-xs text-slate-500">
              {totalMachines} maszyn • {sectionsRequiringAttention} sekcji z uwaga
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/halls"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Hale
          </Link>
          <Link
            to="/machines"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            Maszyny
          </Link>
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || loading || saving}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cofnij
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo || loading || saving}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ponow
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={loading || saving}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ladowanie..." : "Odswiez"}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading}
            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Zapisywanie..." : "Zapisz"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <MetricPill label="Awarie" value={String(activeIncidents)} tone={activeIncidents > 0 ? "rose" : "emerald"} />
        <MetricPill label="UR" value={String(openWorkOrders)} tone={openWorkOrders > 0 ? "amber" : "emerald"} />
        <MetricPill
          label="Skala 1:1"
          value={`${machinesWithRealFootprint}/${totalMachines || 0}`}
          tone="sky"
        />
        <StatusBadge
          tone={validationErrorsCount > 0 ? "rose" : "emerald"}
          label={
            validationErrorsCount > 0
              ? `${validationErrorsCount} bledow`
              : "Bez bledow walidacji"
          }
        />
        <StatusBadge
          tone={validationWarningsCount > 0 ? "amber" : "slate"}
          label={
            validationWarningsCount > 0
              ? `${validationWarningsCount} ostrzezen`
              : "Bez ostrzezen"
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ToggleButton
          active={!leftPanelCollapsed}
          onClick={onToggleLeftPanel}
          label={leftPanelCollapsed ? "Pokaz lewy panel" : "Ukryj lewy panel"}
        />
        <ToggleButton
          active={!rightPanelCollapsed}
          onClick={onToggleRightPanel}
          label={rightPanelCollapsed ? "Pokaz prawy panel" : "Ukryj prawy panel"}
        />
        <ToggleButton
          active={focusMode}
          onClick={onToggleFocusMode}
          label="Tryb fokus"
        />
        <ToggleButton
          active={attentionMode}
          onClick={onToggleAttentionMode}
          label="Tylko uwaga"
        />
        <ToggleButton
          active={showLabels}
          onClick={onToggleLabels}
          label="Etykiety"
        />
        <ToggleButton
          active={showOverview}
          onClick={onToggleOverview}
          label="Widok hali"
        />
        <ToggleButton
          active={showLegend}
          onClick={onToggleLegend}
          label="Legenda"
        />
        <ToggleButton
          active={diagnosticsOpen}
          onClick={onToggleDiagnostics}
          label="Diagnostyka"
        />
      </div>

      {controls ? <div className="mt-3">{controls}</div> : null}
    </div>
  );
}

function StatusBadge({
  tone,
  label,
}: {
  tone: "slate" | "emerald" | "amber" | "rose";
  label: string;
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "slate" | "emerald" | "amber" | "rose" | "sky";
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-200 bg-slate-50 text-slate-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      <span className="uppercase tracking-wide opacity-75">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
        active
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
