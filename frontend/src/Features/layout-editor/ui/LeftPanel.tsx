import { useMemo, useState } from "react";
import type { HallDetailsResponse } from "../../halls/api/contracts";
import type {
  LayoutEditorMode,
  LayoutSectionOverlay,
} from "../model/editorTypes";
import {
  MachinePalette,
  type MachinePaletteItem,
} from "./components/MachinePalette";

interface LeftPanelProps {
  hall: HallDetailsResponse | null;
  sections: LayoutSectionOverlay[];
  machineCatalog: MachinePaletteItem[];
  placedMachinesCount: number;
  getSectionMachinesCount: (sectionId: string) => number;
  mode: LayoutEditorMode;
  pendingMachineId: string | null;
  selectedAssetId: string | null;
  onSelectMachine: (assetId: string) => void;
  onPickMachine: (assetId: string) => void;
  onStartBoundaryRedraw: () => void;
  onCancelMachinePlacement: () => void;
}

export function LeftPanel({
  hall,
  sections,
  machineCatalog,
  placedMachinesCount,
  getSectionMachinesCount,
  mode,
  pendingMachineId,
  selectedAssetId,
  onSelectMachine,
  onPickMachine,
  onStartBoundaryRedraw,
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
    <aside className="flex w-80 flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Hala i narzędzia
        </div>
        <div className="mt-2 text-sm font-semibold text-slate-900">
          {hall?.name ?? "Brak wybranej hali"}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {hall
            ? `Kod ${hall.code} • ${sections.length} sekcji • ${placedMachinesCount} maszyn na layoutcie`
            : "Najpierw wybierz halę, aby rozpocząć pracę na layoutcie."}
        </div>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={onStartBoundaryRedraw}
          className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
          disabled={!hall}
        >
          Przerysuj obrys hali
        </button>
        {mode === "place-machine" ? (
          <button
            type="button"
            onClick={onCancelMachinePlacement}
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-left text-sm font-medium text-rose-900 hover:bg-rose-100"
          >
            Anuluj umieszczanie maszyny
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sekcje hali
        </div>
        <div className="mt-3 space-y-2">
          {sections.length > 0 ? (
            sections.map((section) => {
              const assignedMachines = getSectionMachinesCount(section.id);
              return (
                <div
                  key={section.id}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="text-sm font-medium text-slate-900">{section.name}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {section.code ? `${section.code} • ` : ""}
                    {assignedMachines} maszyn • {formatArea(section.areaSqMeters)} m²
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
              Ta hala nie ma jeszcze zdefiniowanych sekcji.
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200">
        <div className="border-b border-slate-200 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Katalog maszyn
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj po nazwie, kodzie lub kategorii..."
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
          />
        </div>

        <div className="h-full overflow-y-auto p-3">
          <MachinePalette
            machines={filteredMachines}
            pendingMachineId={pendingMachineId}
            selectedAssetId={selectedAssetId}
            onFocus={onSelectMachine}
            onPick={onPickMachine}
          />
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
