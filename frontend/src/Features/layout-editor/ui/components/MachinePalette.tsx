import { AssetStatus } from "../../../machines/api/contracts";

export interface MachinePaletteItem {
  id: string;
  name: string;
  code: string;
  category?: string | null;
  status: AssetStatus;
  isPlacedOnCurrentHall: boolean;
}

type Props = {
  machines: MachinePaletteItem[];
  pendingMachineId: string | null;
  selectedAssetId: string | null;
  canPick: boolean;
  onPick: (machineId: string) => void;
  onFocus: (machineId: string) => void;
};

const statusLabels: Record<AssetStatus, string> = {
  [AssetStatus.Available]: "Dostepna",
  [AssetStatus.InUse]: "W uzyciu",
  [AssetStatus.InMaintenance]: "W serwisie",
  [AssetStatus.Broken]: "Uszkodzona",
  [AssetStatus.Retired]: "Wycofana",
};

export function MachinePalette({
  machines,
  pendingMachineId,
  selectedAssetId,
  canPick,
  onPick,
  onFocus,
}: Props) {
  if (machines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-4 text-sm text-slate-400">
        Brak maszyn spelniajacych kryteria.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {machines.map((machine) => {
        const isPending = machine.id === pendingMachineId;
        const isSelected = machine.id === selectedAssetId;

        return (
          <li
            key={machine.id}
            className={[
              "rounded-lg border px-3 py-3",
              isSelected
                ? "border-sky-500 bg-sky-950/60 text-white"
                : "border-slate-800 bg-slate-950 text-slate-100",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{machine.name}</div>
                <div
                  className={[
                    "mt-1 text-xs",
                    isSelected ? "text-slate-200" : "text-slate-400",
                  ].join(" ")}
                >
                  {machine.code} - {machine.category ?? "Bez kategorii"}
                </div>
                <div
                  className={[
                    "mt-1 text-[11px]",
                    isSelected ? "text-slate-300" : "text-slate-500",
                  ].join(" ")}
                >
                  {statusLabels[machine.status]}
                  {machine.isPlacedOnCurrentHall ? " - juz na tej hali" : ""}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onFocus(machine.id)}
                  className={[
                    "rounded-md border px-2 py-1 text-[11px] font-medium",
                    isSelected
                      ? "border-sky-400 bg-sky-900/70 text-white"
                      : "border-slate-700 text-slate-200 hover:bg-slate-900",
                  ].join(" ")}
                >
                  Pokaz
                </button>
                <button
                  type="button"
                  onClick={() => onPick(machine.id)}
                  disabled={!canPick}
                  className={[
                    "rounded-md px-2 py-1 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-60",
                    isPending
                      ? "bg-amber-500 text-slate-950"
                      : "bg-sky-500 text-slate-950 hover:bg-sky-400",
                  ].join(" ")}
                >
                  {!canPick
                    ? "Wybierz sekcje"
                    : isPending
                      ? "Kliknij na planie"
                      : "Umiesc"}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
