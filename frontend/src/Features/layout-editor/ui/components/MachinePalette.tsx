import { useMachinesStore } from "../../../../entities/machines/model/useMachinesStore";

type Props = { onPick: (machineId: string) => void };

export function MachinePalette({ onPick }: Props) {
  const machines = useMachinesStore((s) => s.machines);
  return (
    <div>
      <div className="font-medium mb-2">Maszyny</div>
      <ul className="space-y-2">
        {machines.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm">
            <span>{m.name}</span>
            <button
              onClick={() => onPick(m.id)}
              className="px-2 py-1 text-xs rounded-md bg-slate-900 text-white"
            >
              Dodaj
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
