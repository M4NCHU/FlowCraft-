import { Link } from "react-router-dom";
import type { HallDetailsResponse } from "../../halls/api/contracts";
import type {
  LayoutMachineItem,
  LayoutRoadDraft,
  LayoutSectionDraft,
  LayoutSectionOverlay,
} from "../model/editorTypes";
import type { TransportPath } from "../model/layoutTypes";

interface RightPanelProps {
  hall: HallDetailsResponse | null;
  sections: LayoutSectionOverlay[];
  selectedRoad: TransportPath | null;
  selectedRoadLengthLabel: string | null;
  draftRoad: LayoutRoadDraft | null;
  draftRoadLengthLabel: string | null;
  selectedMachine: LayoutMachineItem | null;
  selectedSection: LayoutSectionOverlay | null;
  sectionDraft: LayoutSectionDraft | null;
  savingSection: boolean;
  deletingSection: boolean;
  onUpdateMachine: (assetId: string, patch: Partial<LayoutMachineItem>) => void;
  onRemoveMachineFromHall: (assetId: string) => void;
  onUpdateRoad: (roadId: string, patch: Partial<TransportPath>) => void;
  onDeleteRoad: () => void;
  onChangeRoadDraft: (patch: Partial<LayoutRoadDraft>) => void;
  onChangeSectionDraft: (patch: Partial<LayoutSectionDraft>) => void;
  onResetSectionDraftBoundary: () => void;
  onResetRoadDraft: () => void;
  onFinishRoad: () => void;
  onCancelRoadDraft: () => void;
  onSaveSection: () => void;
  onCancelSectionDraft: () => void;
  onStartEditSection: () => void;
  onDeleteSection: () => void;
}

const panelClassName =
  "flex h-full min-h-0 w-[20rem] max-w-[88vw] flex-shrink-0 flex-col overflow-y-auto rounded-[1.25rem] border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-[0_24px_60px_-32px_rgba(2,6,23,0.95)] 2xl:w-[22rem]";

const subtleCardClassName =
  "mt-5 rounded-xl border border-slate-800 bg-slate-900/80 p-4";

const secondaryButtonClassName =
  "rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800";

export function RightPanel({
  hall,
  sections,
  selectedRoad,
  selectedRoadLengthLabel,
  draftRoad,
  draftRoadLengthLabel,
  selectedMachine,
  selectedSection,
  sectionDraft,
  savingSection,
  deletingSection,
  onUpdateMachine,
  onRemoveMachineFromHall,
  onUpdateRoad,
  onDeleteRoad,
  onChangeRoadDraft,
  onChangeSectionDraft,
  onResetSectionDraftBoundary,
  onResetRoadDraft,
  onFinishRoad,
  onCancelRoadDraft,
  onSaveSection,
  onCancelSectionDraft,
  onStartEditSection,
  onDeleteSection,
}: RightPanelProps) {
  if (sectionDraft) {
    const pointsCount = sectionDraft.boundary.points.length / 2;
    const isReadyToSave = sectionDraft.boundary.closed && pointsCount >= 3;

    return (
      <aside className={panelClassName}>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Edycja sekcji
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-100">
          {sectionDraft.id ? "Aktualizacja sekcji" : "Nowa sekcja"}
        </div>
        <div className="mt-1 text-sm text-slate-400">
          Uzupełnij dane i zamknij obrys sekcji na planie hali.
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-200">
          <TextField
            label="Nazwa sekcji"
            value={sectionDraft.name}
            onChange={(value) => onChangeSectionDraft({ name: value })}
          />
          <TextField
            label="Kod sekcji"
            value={sectionDraft.code}
            onChange={(value) => onChangeSectionDraft({ code: value })}
          />
          <TextAreaField
            label="Opis"
            value={sectionDraft.description}
            onChange={(value) => onChangeSectionDraft({ description: value })}
          />
        </div>

        <div className={subtleCardClassName}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Obrys sekcji
          </div>
          <div className="mt-2 text-sm font-medium text-slate-100">
            Punkty: {pointsCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {isReadyToSave
              ? "Obrys jest zamknięty i gotowy do zapisu."
              : "Klikaj kolejne punkty na planie. Dwuklik domyka sekcję."}
          </div>
          <button
            type="button"
            onClick={onResetSectionDraftBoundary}
            className={`mt-3 ${secondaryButtonClassName}`}
          >
            Wyczyść obrys sekcji
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSaveSection}
            disabled={!isReadyToSave || !sectionDraft.name.trim() || savingSection}
            className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingSection ? "Zapisywanie..." : "Zapisz sekcję"}
          </button>
          <button
            type="button"
            onClick={onCancelSectionDraft}
            className={secondaryButtonClassName}
          >
            Anuluj
          </button>
        </div>
      </aside>
    );
  }

  if (draftRoad) {
    const pointsCount = draftRoad.points.length / 2;

    return (
      <aside className={panelClassName}>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Nowa droga
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-100">
          Rysowanie drogi
        </div>
        <div className="mt-1 text-sm text-slate-400">
          Droga jest elementem poglądowym zapisywanym w layoutcie hali.
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-200">
          <TextField
            label="Nazwa drogi"
            value={draftRoad.name}
            onChange={(value) => onChangeRoadDraft({ name: value })}
          />
          <NumericField
            label="Szerokość"
            value={draftRoad.width}
            onChange={(value) => onChangeRoadDraft({ width: Math.max(6, value) })}
          />
        </div>

        <div className={subtleCardClassName}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Przebieg drogi
          </div>
          <div className="mt-2 text-sm font-medium text-slate-100">
            Punkty: {pointsCount}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {draftRoadLengthLabel
              ? `Aktualna długość: ${draftRoadLengthLabel}`
              : "Dodaj co najmniej dwa punkty, aby utworzyć drogę."}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Po zapisaniu węzły drogi można dalej przeciągać bez rysowania od nowa.
          </div>
          <button
            type="button"
            onClick={onResetRoadDraft}
            className={`mt-3 ${secondaryButtonClassName}`}
          >
            Wyczyść punkty
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onFinishRoad}
            disabled={draftRoad.points.length < 4}
            className="rounded-md bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Zapisz drogę
          </button>
          <button
            type="button"
            onClick={onCancelRoadDraft}
            className={secondaryButtonClassName}
          >
            Anuluj
          </button>
        </div>
      </aside>
    );
  }

  if (selectedRoad) {
    return (
      <aside className={panelClassName}>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Wybrana droga
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-100">
          {selectedRoad.name}
        </div>
        <div className="mt-1 text-sm text-slate-400">
          {Math.max(selectedRoad.points.length / 2 - 1, 1)} odcinków
          {selectedRoadLengthLabel ? ` • ${selectedRoadLengthLabel}` : ""}
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-200">
          <TextField
            label="Nazwa drogi"
            value={selectedRoad.name}
            onChange={(value) => onUpdateRoad(selectedRoad.id, { name: value })}
          />
          <NumericField
            label="Szerokość"
            value={selectedRoad.width}
            onChange={(value) =>
              onUpdateRoad(selectedRoad.id, { width: Math.max(6, value) })
            }
          />
        </div>

        <div className="mt-5 rounded-xl border border-sky-900/70 bg-sky-950/50 px-3 py-3 text-xs text-sky-100">
          Droga służy do oznaczania ciągów komunikacyjnych. Jej wierzchołki można
          przesuwać bezpośrednio na planie.
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onDeleteRoad}
            className="rounded-md border border-rose-800 bg-rose-950/60 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-900/70"
          >
            Usuń drogę
          </button>
        </div>
      </aside>
    );
  }

  if (selectedMachine) {
    const hasRealFootprint =
      (selectedMachine.footprintWidthMeters ?? 0) > 0 &&
      (selectedMachine.footprintLengthMeters ?? 0) > 0;

    return (
      <aside className={panelClassName}>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Wybrana maszyna
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-100">
          {selectedMachine.name}
        </div>
        <div className="mt-1 text-sm text-slate-400">
          {selectedMachine.code} • {selectedMachine.category ?? "Bez kategorii"}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <InfoTile label="Awarie" value={String(selectedMachine.openIncidentsCount)} />
          <InfoTile label="Zlecenia" value={String(selectedMachine.openWorkOrdersCount)} />
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-200">
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
            disabled={hasRealFootprint}
            onChange={(value) =>
              onUpdateMachine(selectedMachine.assetId, { width: Math.max(20, value) })
            }
          />
          <NumericField
            label="Wysokość"
            value={selectedMachine.height}
            disabled={hasRealFootprint}
            onChange={(value) =>
              onUpdateMachine(selectedMachine.assetId, { height: Math.max(20, value) })
            }
          />
          <NumericField
            label="Rotacja"
            value={selectedMachine.rotationDeg}
            onChange={(value) =>
              onUpdateMachine(selectedMachine.assetId, { rotationDeg: value })
            }
          />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Sekcja
            </span>
            <select
              value={selectedMachine.sectionId ?? ""}
              onChange={(event) =>
                onUpdateMachine(selectedMachine.assetId, {
                  sectionId: event.target.value || null,
                })
              }
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Brak sekcji</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.code ? `${section.name} (${section.code})` : section.name}
                </option>
              ))}
            </select>
          </label>

          {hasRealFootprint ? (
            <div className="rounded-xl border border-sky-900/70 bg-sky-950/50 px-3 py-3 text-xs text-sky-100">
              Rozmiar na planie wynika z gabarytu maszyny:
              {" "}
              {formatDimension(selectedMachine.footprintWidthMeters)} x{" "}
              {formatDimension(selectedMachine.footprintLengthMeters)}.
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRemoveMachineFromHall(selectedMachine.assetId)}
            className="rounded-md border border-rose-800 bg-rose-950/60 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-900/70"
          >
            Usuń z hali
          </button>
          <Link
            to={`/machines/${selectedMachine.assetId}`}
            className={secondaryButtonClassName}
          >
            Szczegóły maszyny
          </Link>
          <Link
            to={`/maintenance?assetId=${encodeURIComponent(selectedMachine.assetId)}`}
            className={secondaryButtonClassName}
          >
            Przeglądy
          </Link>
          <Link
            to={`/activity?assetId=${encodeURIComponent(selectedMachine.assetId)}`}
            className={secondaryButtonClassName}
          >
            Działania
          </Link>
        </div>

        <div className="mt-5 rounded-xl border border-amber-900/70 bg-amber-950/50 px-3 py-3 text-xs text-amber-100">
          Pozycja i rozmiar zapisują się do backendu jako aktualne rozmieszczenie
          maszyny na hali.
        </div>
      </aside>
    );
  }

  if (selectedSection) {
    return (
      <aside className={panelClassName}>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Wybrana sekcja
        </div>
        <div className="mt-2 text-lg font-semibold text-slate-100">
          {selectedSection.name}
        </div>
        <div className="mt-1 text-sm text-slate-400">
          {selectedSection.code ?? "Bez kodu"} • {formatArea(selectedSection.areaSqMeters)} m2
        </div>

        {selectedSection.description ? (
          <div className={`${subtleCardClassName} text-sm text-slate-200`}>
            {selectedSection.description}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
            Ta sekcja nie ma jeszcze opisu.
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStartEditSection}
            className={secondaryButtonClassName}
          >
            Edytuj sekcję
          </button>
          <button
            type="button"
            onClick={onDeleteSection}
            disabled={deletingSection}
            className="rounded-md border border-rose-800 bg-rose-950/60 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-900/70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingSection ? "Usuwanie..." : "Usuń sekcję"}
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={panelClassName}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Kontekst layoutu
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="text-sm font-semibold text-slate-100">
          {hall?.name ?? "Brak wybranej hali"}
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {hall
            ? `${hall.code} • ${sections.length} sekcji • ${roadsLabel(selectedRoad)}`
            : "Wybierz halę z listy, aby otworzyć edytor."}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-sm text-slate-400">
        Zaznacz maszynę, sekcję albo drogę na planie, aby otworzyć szczegóły.
      </div>
    </aside>
  );
}

function NumericField({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
      />
    </label>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function formatArea(value: number) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDimension(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
}

function roadsLabel(selectedRoad: TransportPath | null) {
  if (selectedRoad) return `wybrana droga: ${selectedRoad.name}`;
  return "brak wybranego elementu";
}
