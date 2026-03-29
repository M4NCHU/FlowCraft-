import { Link } from "react-router-dom";
import type { HallDetailsResponse } from "../../halls/api/contracts";
import type {
  LayoutMachineItem,
  LayoutSectionOverlay,
} from "../model/editorTypes";

interface RightPanelProps {
  hall: HallDetailsResponse | null;
  sections: LayoutSectionOverlay[];
  selectedMachine: LayoutMachineItem | null;
  selectedSection: LayoutSectionOverlay | null;
  onUpdateMachine: (assetId: string, patch: Partial<LayoutMachineItem>) => void;
}

export function RightPanel({
  hall,
  sections,
  selectedMachine,
  selectedSection,
  onUpdateMachine,
}: RightPanelProps) {
  if (selectedMachine) {
    return (
      <aside className="hidden w-80 flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:flex">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Wybrana maszyna
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-900">
          {selectedMachine.name}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {selectedMachine.code} • {selectedMachine.category ?? "Bez kategorii"}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <InfoTile label="Awarie" value={String(selectedMachine.openIncidentsCount)} />
          <InfoTile label="Zlecenia" value={String(selectedMachine.openWorkOrdersCount)} />
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <NumericField
            label="Pozycja X"
            value={selectedMachine.x}
            onChange={(value) => onUpdateMachine(selectedMachine.assetId, { x: value })}
          />
          <NumericField
            label="Pozycja Y"
            value={selectedMachine.y}
            onChange={(value) => onUpdateMachine(selectedMachine.assetId, { y: value })}
          />
          <NumericField
            label="Szerokość"
            value={selectedMachine.width}
            onChange={(value) =>
              onUpdateMachine(selectedMachine.assetId, { width: Math.max(20, value) })
            }
          />
          <NumericField
            label="Wysokość"
            value={selectedMachine.height}
            onChange={(value) =>
              onUpdateMachine(selectedMachine.assetId, { height: Math.max(20, value) })
            }
          />
          <NumericField
            label="Rotacja"
            value={selectedMachine.rotationDeg}
            onChange={(value) => onUpdateMachine(selectedMachine.assetId, { rotationDeg: value })}
          />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Sekcja
            </span>
            <select
              value={selectedMachine.sectionId ?? ""}
              onChange={(event) =>
                onUpdateMachine(selectedMachine.assetId, {
                  sectionId: event.target.value || null,
                })
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Brak sekcji</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code ? `${section.name} (${section.code})` : section.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to={`/machines/${selectedMachine.assetId}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Szczegóły maszyny
          </Link>
          <Link
            to={`/maintenance?assetId=${encodeURIComponent(selectedMachine.assetId)}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Przeglądy
          </Link>
          <Link
            to={`/activity?assetId=${encodeURIComponent(selectedMachine.assetId)}`}
            className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Działania
          </Link>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
          Pozycja i rozmiar zapiszą się do backendu jako aktualne rozmieszczenie maszyny na hali.
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-80 flex-shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:flex">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Kontekst layoutu
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-900">
          {hall?.name ?? "Brak wybranej hali"}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {hall ? `${hall.code} • ${sections.length} sekcji` : "Wybierz halę z listy lub przejdź z ekranu hal."}
        </div>
      </div>

      {selectedSection ? (
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-900">Wybrana sekcja</div>
          <div className="mt-2 text-sm text-slate-800">{selectedSection.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {selectedSection.code ? `${selectedSection.code} • ` : ""}
            {formatArea(selectedSection.areaSqMeters)} m²
          </div>
          {selectedSection.description ? (
            <div className="mt-2 text-xs text-slate-600">{selectedSection.description}</div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
        Zaznacz maszynę na planie, aby zmienić jej pozycję, rozmiar, rotację i przypisanie do sekcji.
      </div>
    </aside>
  );
}

function NumericField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatArea(value: number) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 1,
  }).format(value);
}
