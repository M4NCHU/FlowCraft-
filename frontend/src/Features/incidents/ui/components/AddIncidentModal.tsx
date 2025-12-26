import { useEffect, useId, useState } from "react";
import { useIncidentsStore } from "../../../../entities/incidents/model/useIncidentsStore";
import type { IncidentSeverity } from "../../../../entities/incidents/model/useIncidentsStore";
import { useMachinesStore } from "../../../../entities/machines/model/useMachinesStore";

type Props = { open: boolean; onClose: () => void };

export function AddIncidentModal({ open, onClose }: Props) {
  const addIncident = useIncidentsStore((s) => s.addIncident);
  const machines = useMachinesStore((s) => s.machines);

  const titleId = useId();
  const descId = useId();
  const sevId = useId();
  const machId = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");
  const [machineId, setMachineId] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setSeverity("medium");
      setMachineId("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Tytuł jest wymagany.");
      return;
    }
    addIncident({
      title: title.trim(),
      description: description.trim() || undefined,
      severity,
      status: "open",
      machineId: machineId || undefined,
      reportedBy: "mszwast",
    });
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
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">Nowa awaria/usterka</h2>
        </div>

        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor={titleId} className="text-sm text-slate-600">
              Tytuł <span className="text-rose-600">*</span>
            </label>
            <input
              id={titleId}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              placeholder="np. Wycieki hydrauliki"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={descId} className="text-sm text-slate-600">
              Opis
            </label>
            <textarea
              id={descId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              placeholder="Krótki opis problemu…"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={sevId} className="text-sm text-slate-600">
                Priorytet
              </label>
              <select
                id={sevId}
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as IncidentSeverity)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="high">Wysoki</option>
                <option value="medium">Średni</option>
                <option value="low">Niski</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={machId} className="text-sm text-slate-600">
                Maszyna
              </label>
              <select
                id={machId}
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="">Brak/nie dotyczy</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
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
