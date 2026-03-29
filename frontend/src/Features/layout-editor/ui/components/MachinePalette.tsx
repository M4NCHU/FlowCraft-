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
  onPick: (machineId: string) => void;
  onFocus: (machineId: string) => void;
};

const statusLabels: Record<AssetStatus, string> = {
  [AssetStatus.Available]: "Dostępna",
  [AssetStatus.InUse]: "W użyciu",
  [AssetStatus.InMaintenance]: "W serwisie",
  [AssetStatus.Broken]: "Uszkodzona",
  [AssetStatus.Retired]: "Wycofana",
};

export function MachinePalette({
  machines,
  pendingMachineId,
  selectedAssetId,
  onPick,
  onFocus,
}: Props) {
  if (machines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">
        Brak maszyn spełniających kryteria.
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
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{machine.name}</div>
                <div
                  className={[
                    "mt-1 text-xs",
                    isSelected ? "text-slate-200" : "text-slate-500",
                  ].join(" ")}
                >
                  {machine.code} • {machine.category ?? "Bez kategorii"}
                </div>
                <div
                  className={[
                    "mt-1 text-[11px]",
                    isSelected ? "text-slate-300" : "text-slate-500",
                  ].join(" ")}
                >
                  {statusLabels[machine.status]}
                  {machine.isPlacedOnCurrentHall ? " • już na tej hali" : ""}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onFocus(machine.id)}
                  className={[
                    "rounded-md border px-2 py-1 text-[11px] font-medium",
                    isSelected
                      ? "border-slate-700 bg-slate-800 text-white"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Pokaż
                </button>
                <button
                  type="button"
                  onClick={() => onPick(machine.id)}
                  className={[
                    "rounded-md px-2 py-1 text-[11px] font-medium",
                    isPending
                      ? "bg-amber-500 text-white"
                      : "bg-slate-900 text-white hover:bg-slate-800",
                  ].join(" ")}
                >
                  {isPending ? "Kliknij na planie" : "Umieść"}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
