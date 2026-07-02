import { type ReactNode, useMemo, useState } from "react";
import type { HallDetailsResponse } from "../../halls/api/contracts";
import type {
  LayoutEditorMode,
  LayoutRoadDraft,
  LayoutSectionOverlay,
  LayoutSectionPresentationStats,
} from "../model/editorTypes";
import type { LayoutValidationIssue } from "../lib/layoutValidation";
import type { TransportPath } from "../model/layoutTypes";
import {
  MachinePalette,
  type MachinePaletteItem,
} from "./components/MachinePalette";

interface LeftPanelProps {
  hall: HallDetailsResponse | null;
  sections: LayoutSectionOverlay[];
  selectedSection: LayoutSectionOverlay | null;
  machineCatalog: MachinePaletteItem[];
  roads: TransportPath[];
  placedMachinesCount: number;
  selectedSectionId: string | null;
  selectedRoadId: string | null;
  getSectionMachinesCount: (sectionId: string) => number;
  sectionStatsById: Record<string, LayoutSectionPresentationStats>;
  hallPresentationStats: {
    totalMachines: number;
    activeIncidents: number;
    openWorkOrders: number;
    sectionsRequiringAttention: number;
    machinesWithRealFootprint: number;
  };
  mode: LayoutEditorMode;
  pendingMachineId: string | null;
  selectedAssetId: string | null;
  roadDraft: LayoutRoadDraft | null;
  dirtyCount: number;
  saving: boolean;
  loading: boolean;
  canUndo: boolean;
  canRedo: boolean;
  focusMode: boolean;
  attentionMode: boolean;
  showLabels: boolean;
  showLegend: boolean;
  showOverview: boolean;
  diagnosticsOpen: boolean;
  statusTone: "slate" | "amber" | "emerald" | "rose" | "sky";
  statusMessage: string;
  validationIssues: LayoutValidationIssue[];
  validationErrorsCount: number;
  validationWarningsCount: number;
  recoverableDraft: boolean;
  rightPanelCollapsed: boolean;
  controls?: ReactNode;
  canUndoLastPoint: boolean;
  canFinishCurrentShape: boolean;
  onReload: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleRightPanel: () => void;
  onToggleFocusMode: () => void;
  onToggleAttentionMode: () => void;
  onToggleLabels: () => void;
  onToggleLegend: () => void;
  onToggleOverview: () => void;
  onToggleDiagnostics: () => void;
  onRestoreDraft: () => void;
  onDiscardRecoveredDraft: () => void;
  onSelectMachine: (assetId: string) => void;
  onPickMachine: (assetId: string) => void;
  onStartBoundaryRedraw: () => void;
  onStartSectionDraw: () => void;
  onStartRoadDraw: () => void;
  onSelectSection: (sectionId: string) => void;
  onSelectRoad: (roadId: string) => void;
  onUndoLastPoint: () => void;
  onFinishCurrentShape?: () => void;
  onCancelSectionDraw: () => void;
  onCancelRoadDraw: () => void;
  onCancelMachinePlacement: () => void;
}

const defaultSectionStats: LayoutSectionPresentationStats = {
  machineCount: 0,
  incidentsCount: 0,
  workOrdersCount: 0,
  attentionMachinesCount: 0,
  health: "idle",
};

export function LeftPanel({
  hall,
  sections,
  selectedSection,
  machineCatalog,
  roads,
  placedMachinesCount,
  selectedSectionId,
  selectedRoadId,
  getSectionMachinesCount,
  sectionStatsById,
  hallPresentationStats,
  mode,
  pendingMachineId,
  selectedAssetId,
  roadDraft,
  dirtyCount,
  saving,
  loading,
  canUndo,
  canRedo,
  focusMode,
  attentionMode,
  showLabels,
  showLegend,
  showOverview,
  diagnosticsOpen,
  statusTone,
  statusMessage,
  validationIssues,
  validationErrorsCount,
  validationWarningsCount,
  recoverableDraft,
  rightPanelCollapsed,
  controls,
  canUndoLastPoint,
  canFinishCurrentShape,
  onReload,
  onSave,
  onUndo,
  onRedo,
  onToggleRightPanel,
  onToggleFocusMode,
  onToggleAttentionMode,
  onToggleLabels,
  onToggleLegend,
  onToggleOverview,
  onToggleDiagnostics,
  onRestoreDraft,
  onDiscardRecoveredDraft,
  onSelectMachine,
  onPickMachine,
  onStartBoundaryRedraw,
  onStartSectionDraw,
  onStartRoadDraw,
  onSelectSection,
  onSelectRoad,
  onUndoLastPoint,
  onFinishCurrentShape,
  onCancelSectionDraw,
  onCancelRoadDraw,
  onCancelMachinePlacement,
}: LeftPanelProps) {
  const [query, setQuery] = useState("");

  const filteredMachines = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return machineCatalog
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, "pl"))
      .filter((machine) => {
        if (!normalizedQuery) return true;
        return (
          machine.name.toLowerCase().includes(normalizedQuery) ||
          machine.code.toLowerCase().includes(normalizedQuery) ||
          (machine.category ?? "").toLowerCase().includes(normalizedQuery)
        );
      });
  }, [machineCatalog, query]);

  return (
    <aside className="flex h-full min-h-0 w-[20rem] flex-shrink-0 flex-col overflow-hidden rounded-[1.25rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-[0_24px_60px_-32px_rgba(2,6,23,0.95)] 2xl:w-[22rem]">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Edytor layoutu
        </div>
        <div className="mt-2 text-base font-semibold text-slate-100">
          {hall?.name ?? "Brak wybranej hali"}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {hall
            ? `Kod ${hall.code} | ${sections.length} sekcji | ${placedMachinesCount} maszyn | ${roads.length} drog`
            : "Najpierw wybierz hale, aby rozpoczac prace na layoutcie."}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      <div className="mb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading}
            className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Zapisywanie..." : dirtyCount > 0 ? "Zapisz zmiany" : "Zapisz"}
          </button>
          <button
            type="button"
            onClick={onReload}
            disabled={saving || loading}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ladowanie..." : "Odswiez"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo || saving || loading}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cofnij
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo || saving || loading}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Ponow
          </button>
        </div>
      </div>

      <StatusBox
        tone={statusTone}
        message={statusMessage}
        recoverableDraft={recoverableDraft}
        validationErrorsCount={validationErrorsCount}
        validationWarningsCount={validationWarningsCount}
        diagnosticsOpen={diagnosticsOpen}
        onToggleDiagnostics={onToggleDiagnostics}
        onRestoreDraft={onRestoreDraft}
        onDiscardRecoveredDraft={onDiscardRecoveredDraft}
      />

      {diagnosticsOpen && validationIssues.length > 0 ? (
        <div className="mb-4 space-y-2 rounded-2xl border border-amber-900/70 bg-amber-950/50 p-3">
          {validationIssues.map((issue) => (
            <div
              key={issue.id}
              className={[
                "rounded-xl border px-3 py-3",
                issue.severity === "error"
                  ? "border-rose-800 bg-slate-950 text-rose-100"
                  : "border-amber-800 bg-slate-950 text-amber-100",
              ].join(" ")}
            >
              <div className="text-sm font-medium">{issue.title}</div>
              <div className="mt-1 text-xs opacity-80">{issue.message}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-3 gap-2">
        <SummaryCard
          label="Awarie"
          value={hallPresentationStats.activeIncidents}
          tone={hallPresentationStats.activeIncidents > 0 ? "rose" : "emerald"}
        />
        <SummaryCard
          label="UR"
          value={hallPresentationStats.openWorkOrders}
          tone={hallPresentationStats.openWorkOrders > 0 ? "amber" : "emerald"}
        />
        <SummaryCard
          label="Sekcje"
          value={hallPresentationStats.sectionsRequiringAttention}
          tone={
            hallPresentationStats.sectionsRequiringAttention > 0 ? "sky" : "slate"
          }
        />
      </div>

      <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Widok i skala
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <ToggleChip
            active={!rightPanelCollapsed}
            label={rightPanelCollapsed ? "Pokaz szczegoly" : "Ukryj szczegoly"}
            onClick={onToggleRightPanel}
          />
          <ToggleChip active={focusMode} label="Fokus" onClick={onToggleFocusMode} />
          <ToggleChip
            active={attentionMode}
            label="Tylko uwaga"
            onClick={onToggleAttentionMode}
          />
          <ToggleChip active={showLabels} label="Etykiety" onClick={onToggleLabels} />
          <ToggleChip active={showOverview} label="Podglad hali" onClick={onToggleOverview} />
          <ToggleChip active={showLegend} label="Legenda" onClick={onToggleLegend} />
        </div>
        {controls ? <div className="mt-3">{controls}</div> : null}
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={onStartBoundaryRedraw}
          className="rounded-md border border-slate-700 px-3 py-2 text-left text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!hall}
        >
          Przerysuj obrys hali
        </button>
        <button
          type="button"
          onClick={onStartSectionDraw}
          className="rounded-md border border-slate-700 px-3 py-2 text-left text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!hall}
        >
          Wyznacz nowa sekcje
        </button>
        <button
          type="button"
          onClick={onStartRoadDraw}
          className="rounded-md border border-slate-700 px-3 py-2 text-left text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!hall}
        >
          Rysuj droge transportowa
        </button>

        {canUndoLastPoint ? (
          <button
            type="button"
            onClick={onUndoLastPoint}
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Cofnij ostatni punkt
          </button>
        ) : null}

        {canFinishCurrentShape && onFinishCurrentShape ? (
          <button
            type="button"
            onClick={onFinishCurrentShape}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm font-medium text-emerald-900 transition hover:bg-emerald-100"
          >
            {mode === "draw-road" ? "Zakoncz droge" : "Domknij obrys"}
          </button>
        ) : null}

        {mode === "draw-road" ? (
          <button
            type="button"
            onClick={onCancelRoadDraw}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm font-medium text-rose-900 transition hover:bg-rose-100"
          >
            Anuluj rysowanie drogi
          </button>
        ) : null}

        {mode === "draw-section" ? (
          <button
            type="button"
            onClick={onCancelSectionDraw}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm font-medium text-rose-900 transition hover:bg-rose-100"
          >
            Anuluj rysowanie sekcji
          </button>
        ) : null}

        {mode === "place-machine" ? (
          <button
            type="button"
            onClick={onCancelMachinePlacement}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm font-medium text-rose-900 transition hover:bg-rose-100"
          >
            Anuluj umieszczanie maszyny
          </button>
        ) : null}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Drogi pogladowe
          </div>
          <div className="text-[11px] text-slate-400">{roads.length} zapisanych</div>
        </div>

        <div className="mt-3 space-y-2">
          {roadDraft ? (
            <div className="rounded-xl border border-emerald-900/70 bg-slate-950 px-3 py-3">
              <div className="text-sm font-semibold text-slate-100">
                {roadDraft.name || "Nowa droga"}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Punkty: {roadDraft.points.length / 2} | Szerokosc:{" "}
                {formatMetric(roadDraft.width, 0)}
              </div>
              <div className="mt-2 text-xs text-emerald-800">
                Klikaj na mapie kolejne punkty drogi. Dwuklik lub przycisk wyzej
                konczy rysowanie.
              </div>
            </div>
          ) : roads.length > 0 ? (
            roads
              .slice()
              .sort((left, right) => left.name.localeCompare(right.name, "pl"))
              .map((road) => (
                <button
                  key={road.id}
                  type="button"
                  onClick={() => onSelectRoad(road.id)}
                  className={[
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    selectedRoadId === road.id
                      ? "border-sky-500 bg-sky-950/50 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
                      : "border-slate-800 bg-slate-950 hover:bg-slate-900",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold text-slate-100">
                    {road.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Odcinki: {Math.max(road.points.length / 2 - 1, 1)} | Szerokosc:{" "}
                    {formatMetric(road.width, 0)}
                  </div>
                </button>
              ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-4 text-sm text-slate-400">
              Nie ma jeszcze narysowanych drog pogladowych.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Sekcje hali
          </div>
          <div className="text-[11px] text-slate-400">
            {hallPresentationStats.machinesWithRealFootprint}/
            {hallPresentationStats.totalMachines || 0} maszyn 1:1
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {sections.length > 0 ? (
            sections.map((section) => {
              const fallbackAssignedMachines = getSectionMachinesCount(section.id);
              const stats = sectionStatsById[section.id] ?? defaultSectionStats;
              const assignedMachines = stats.machineCount || fallbackAssignedMachines;
              const isSelected = selectedSectionId === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSelectSection(section.id)}
                  className={[
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    sectionButtonTone(stats.health, isSelected),
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        {section.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {section.code ? `${section.code} | ` : ""}
                        {assignedMachines} maszyn | {formatArea(section.areaSqMeters)} m2
                      </div>
                    </div>
                    <HealthBadge health={stats.health} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <SectionStatPill tone="slate">
                      {assignedMachines} maszyn
                    </SectionStatPill>
                    {stats.incidentsCount > 0 ? (
                      <SectionStatPill tone="rose">
                        ! {stats.incidentsCount} aw.
                      </SectionStatPill>
                    ) : null}
                    {stats.workOrdersCount > 0 ? (
                      <SectionStatPill tone="amber">
                        UR {stats.workOrdersCount}
                      </SectionStatPill>
                    ) : null}
                    {stats.incidentsCount === 0 &&
                    stats.workOrdersCount === 0 &&
                    assignedMachines > 0 ? (
                      <SectionStatPill tone="emerald">Gotowa</SectionStatPill>
                    ) : null}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950 px-3 py-4 text-sm text-slate-400">
              Ta hala nie ma jeszcze zdefiniowanych sekcji.
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 min-h-[16rem] rounded-2xl border border-slate-800 bg-slate-900/80">
        <div className="border-b border-slate-800 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Katalog maszyn
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {selectedSection
              ? `Aktywna sekcja: ${selectedSection.code ? `${selectedSection.name} (${selectedSection.code})` : selectedSection.name}`
              : "Kliknij sekcje hali, aby odblokowac dodawanie maszyn."}
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj po nazwie, kodzie lub kategorii..."
            className="mt-3 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
          />
        </div>

        <div className="p-3">
          <MachinePalette
            machines={filteredMachines}
            pendingMachineId={pendingMachineId}
            selectedAssetId={selectedAssetId}
            canPick={Boolean(selectedSectionId)}
            onFocus={onSelectMachine}
            onPick={onPickMachine}
          />
        </div>
      </div>
      </div>
    </aside>
  );
}

function formatArea(value: number) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMetric(value: number, maximumFractionDigits = 1) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits,
  }).format(value);
}

function sectionButtonTone(
  health: LayoutSectionPresentationStats["health"],
  isSelected: boolean
) {
  if (isSelected) {
    return "border-sky-500 bg-sky-950/50 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]";
  }

  switch (health) {
    case "critical":
      return "border-rose-900/70 bg-rose-950/50 hover:bg-rose-900/60";
    case "warning":
      return "border-amber-900/70 bg-amber-950/50 hover:bg-amber-900/60";
    case "ok":
      return "border-emerald-900/70 bg-emerald-950/50 hover:bg-emerald-900/60";
    default:
      return "border-slate-800 bg-slate-950 hover:bg-slate-900";
  }
}

function HealthBadge({
  health,
}: {
  health: LayoutSectionPresentationStats["health"];
}) {
  const badgeByHealth: Record<
    LayoutSectionPresentationStats["health"],
    { label: string; className: string }
  > = {
    idle: {
      label: "Pusta",
      className: "border-slate-700 bg-slate-900 text-slate-300",
    },
    ok: {
      label: "OK",
      className: "border-emerald-800 bg-emerald-950/60 text-emerald-100",
    },
    warning: {
      label: "UR",
      className: "border-amber-800 bg-amber-950/60 text-amber-100",
    },
    critical: {
      label: "Alert",
      className: "border-rose-800 bg-rose-950/60 text-rose-100",
    },
  };

  const badge = badgeByHealth[health];

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "rose" | "sky";
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-800 bg-slate-900 text-slate-100",
    emerald: "border-emerald-900/70 bg-emerald-950/50 text-emerald-100",
    amber: "border-amber-900/70 bg-amber-950/50 text-amber-100",
    rose: "border-rose-900/70 bg-rose-950/50 text-rose-100",
    sky: "border-sky-900/70 bg-sky-950/50 text-sky-100",
  };

  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClasses[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold leading-none">{value}</div>
    </div>
  );
}

function SectionStatPill({
  tone,
  children,
}: {
  tone: "slate" | "emerald" | "amber" | "rose";
  children: string;
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "bg-slate-800 text-slate-200",
    emerald: "bg-emerald-950/70 text-emerald-100",
    amber: "bg-amber-950/70 text-amber-100",
    rose: "bg-rose-950/70 text-rose-100",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

function ToggleChip({
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
        "rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
        active
          ? "border-sky-700 bg-sky-950/60 text-sky-100"
          : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function StatusBox({
  tone,
  message,
  recoverableDraft,
  validationErrorsCount,
  validationWarningsCount,
  diagnosticsOpen,
  onToggleDiagnostics,
  onRestoreDraft,
  onDiscardRecoveredDraft,
}: {
  tone: "slate" | "amber" | "emerald" | "rose" | "sky";
  message: string;
  recoverableDraft: boolean;
  validationErrorsCount: number;
  validationWarningsCount: number;
  diagnosticsOpen: boolean;
  onToggleDiagnostics: () => void;
  onRestoreDraft: () => void;
  onDiscardRecoveredDraft: () => void;
}) {
  const toneClasses: Record<typeof tone, string> = {
    slate: "border-slate-800 bg-slate-900 text-slate-300",
    amber: "border-amber-900/70 bg-amber-950/50 text-amber-100",
    emerald: "border-emerald-900/70 bg-emerald-950/50 text-emerald-100",
    rose: "border-rose-900/70 bg-rose-950/50 text-rose-100",
    sky: "border-sky-900/70 bg-sky-950/50 text-sky-100",
  };

  return (
    <div className={`mb-4 rounded-2xl border p-3 ${toneClasses[tone]}`}>
      <div className="text-sm leading-5">{message}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {recoverableDraft ? (
          <>
            <button
              type="button"
              onClick={onRestoreDraft}
              className="rounded-xl border border-sky-700 bg-slate-950 px-3 py-2 text-xs font-medium text-sky-100 transition hover:bg-sky-950/60"
            >
              Przywroc wersje
            </button>
            <button
              type="button"
              onClick={onDiscardRecoveredDraft}
              className="rounded-xl border border-sky-800 bg-transparent px-3 py-2 text-xs font-medium text-sky-100 transition hover:bg-sky-950/60"
            >
              Odrzuc
            </button>
          </>
        ) : null}
        {validationErrorsCount + validationWarningsCount > 0 ? (
          <button
            type="button"
            onClick={onToggleDiagnostics}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-slate-800"
          >
            {diagnosticsOpen ? "Ukryj diagnostyke" : "Pokaz diagnostyke"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
