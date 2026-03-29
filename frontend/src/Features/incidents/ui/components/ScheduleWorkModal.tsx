import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import {
  FailureSeverity,
  FailureStatus,
  type FailureReportDto,
} from "../../api/contracts";
import { failureReportsApi } from "../../api/failureReportsApi";
import {
  WorkOrderPriority,
  WorkOrderType,
} from "../../../work-orders/api/contracts";
import { workOrdersApi } from "../../../work-orders/api/workOrdersApi";

type Props = {
  incident: FailureReportDto;
  open: boolean;
  onClose: () => void;
  onScheduled: () => Promise<void> | void;
};

function mapPriority(severity: FailureSeverity): WorkOrderPriority {
  if (severity === FailureSeverity.Critical) return WorkOrderPriority.Critical;
  if (severity === FailureSeverity.High) return WorkOrderPriority.High;
  if (severity === FailureSeverity.Low) return WorkOrderPriority.Low;
  return WorkOrderPriority.Medium;
}

export function ScheduleWorkModal({
  incident,
  open,
  onClose,
  onScheduled,
}: Props) {

  const dtId = useId();
  const ctId = useId();

  const [dueAt, setDueAt] = useState("");
  const [cost, setCost] = useState<string>("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDueAt(
        new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16)
      ); // yyyy-MM-ddTHH:mm
      setCost("");
      setError("");
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueAt) {
      setError("Termin realizacji jest wymagany.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await workOrdersApi.create({
        number: `WO-${Date.now()}`,
        title: `Serwis: ${incident.title}`,
        description: incident.description,
        type: WorkOrderType.CorrectiveMaintenance,
        priority: mapPriority(incident.severity),
        failureReportId: incident.id,
        assetId: incident.assetId ?? null,
        hallId: incident.hallId ?? null,
        sectionId: incident.sectionId ?? null,
        requestedByEmployeeId: incident.reportedByEmployeeId ?? null,
        assignedToEmployeeId: null,
        dueAtUtc: new Date(dueAt).toISOString(),
        estimatedMinutes: null,
        estimatedCost: cost ? Number(cost) : null,
        externalVendor: null,
      });

      await failureReportsApi.setStatus(incident.id, {
        status: FailureStatus.InProgress,
        resolutionSummary: incident.resolutionSummary ?? null,
        rootCause: incident.rootCause ?? null,
      });

      await onScheduled();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się zaplanowac serwisu.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">Zaplanuj serwis</h2>
        </div>
        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
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
              disabled={saving}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Zapisywanie..." : "Zapisz"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
