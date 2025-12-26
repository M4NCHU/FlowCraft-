import { useEffect, useId, useState } from "react";
import { useIncidentsStore } from "../../../../entities/incidents/model/useIncidentsStore";

type Props = { incidentId: string; open: boolean; onClose: () => void };

export function ScheduleWorkModal({ incidentId, open, onClose }: Props) {
  const scheduleWork = useIncidentsStore((s) => s.scheduleWork);
  const assignTo = useIncidentsStore((s) => s.assignTo);
  const updateStatus = useIncidentsStore((s) => s.updateStatus);

  const dtId = useId();
  const asId = useId();
  const ctId = useId();

  const [dueAt, setDueAt] = useState("");
  const [assignee, setAssignee] = useState("");
  const [cost, setCost] = useState<string>("");

  useEffect(() => {
    if (open) {
      setDueAt(
        new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)
      ); // yyyy-MM-ddTHH:mm
      setAssignee("");
      setCost("");
    }
  }, [open]);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueAt) return;
    if (assignee) assignTo(incidentId, assignee);
    scheduleWork(
      incidentId,
      new Date(dueAt).toISOString(),
      cost ? Number(cost) : undefined
    );
    updateStatus(incidentId, "in_progress");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">Zaplanuj serwis</h2>
        </div>
        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={dtId} className="text-sm text-slate-600">
              Termin realizacji
            </label>
            <input
              id={dtId}
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={asId} className="text-sm text-slate-600">
              Przypisz do
            </label>
            <input
              id={asId}
              placeholder="np. tech01"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={ctId} className="text-sm text-slate-600">
              Koszt planowany (PLN)
            </label>
            <input
              id={ctId}
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
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
