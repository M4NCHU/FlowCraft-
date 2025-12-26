import { useEffect, useId, useState } from "react";
import { useMachinesStore } from "../../../../entities/machines/model/useMachinesStore";
import type { MachineStatus } from "../../../../entities/machines/model/useMachinesStore";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddMachineModal({ open, onClose }: Props) {
  const addMachine = useMachinesStore((s) => s.addMachine);

  const nameId = useId();
  const modelId = useId();
  const statusId = useId();

  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState<MachineStatus>("operational");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setModel("");
      setStatus("operational");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nazwa jest wymagana.");
      return;
    }
    addMachine({ name: name.trim(), status, model: model.trim() || undefined });
    onClose();
  };

  const esc = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onKeyDown={esc}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">Dodaj maszynę</h2>
        </div>

        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor={nameId} className="text-sm text-slate-600">
              Nazwa <span className="text-rose-600">*</span>
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              placeholder="np. TRUMPF 3030"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={modelId} className="text-sm text-slate-600">
              Model (opcjonalnie)
            </label>
            <input
              id={modelId}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              placeholder="np. L3030"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={statusId} className="text-sm text-slate-600">
              Status
            </label>
            <select
              id={statusId}
              value={status}
              onChange={(e) => setStatus(e.target.value as MachineStatus)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="operational">Sprawna</option>
              <option value="maintenance">Przegląd/serwis</option>
              <option value="down">Niesprawna</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Zapisz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
