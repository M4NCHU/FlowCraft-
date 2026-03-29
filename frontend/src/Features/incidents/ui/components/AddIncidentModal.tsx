import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import type { AssetListItemDto } from "../../../machines/api/contracts";
import {
  FailureSeverity,
  type FailureCauseCategoryDto,
  type FailureReportDto,
} from "../../api/contracts";
import { failureReportsApi } from "../../api/failureReportsApi";

type Props = {
  open: boolean;
  onClose: () => void;
  machines: AssetListItemDto[];
  causeCategories: FailureCauseCategoryDto[];
  onCreated: (incident: FailureReportDto) => void;
};

export function AddIncidentModal({
  open,
  onClose,
  machines,
  causeCategories,
  onCreated,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const sevId = useId();
  const machId = useId();
  const causeId = useId();
  const lossId = useId();
  const rootCauseId = useId();
  const correctiveActionId = useId();
  const preventiveActionId = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<FailureSeverity>(
    FailureSeverity.Medium
  );
  const [machineId, setMachineId] = useState<string>("");
  const [causeCategoryId, setCauseCategoryId] = useState<string>("");
  const [causesDowntime, setCausesDowntime] = useState(false);
  const [productionLossUnits, setProductionLossUnits] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [preventiveAction, setPreventiveAction] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setSeverity(FailureSeverity.Medium);
      setMachineId("");
      setCauseCategoryId("");
      setCausesDowntime(false);
      setProductionLossUnits("");
      setRootCause("");
      setCorrectiveAction("");
      setPreventiveAction("");
      setError("");
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Tytuł jest wymagany.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await failureReportsApi.create({
        title: title.trim(),
        description: description.trim() || title.trim(),
        severity,
        causesDowntime,
        assetId: machineId || null,
        hallId: null,
        sectionId: null,
        reportedByEmployeeId: null,
        failureCauseCategoryId: causeCategoryId || null,
        downtimeStartedAtUtc: causesDowntime ? new Date().toISOString() : null,
        downtimeEndedAtUtc: null,
        productionLossUnits: productionLossUnits.trim()
          ? Number(productionLossUnits)
          : null,
        rootCause: rootCause.trim() || null,
        correctiveAction: correctiveAction.trim() || null,
        preventiveAction: preventiveAction.trim() || null,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się zapisać zgłoszenia.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">Nowa awaria / usterka</h2>
        </div>

        <form onSubmit={submit} className="space-y-3 px-5 py-4">
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <label htmlFor={titleId} className="text-sm text-slate-600">
              Tytuł <span className="text-rose-600">*</span>
            </label>
            <input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="np. Wyciek hydrauliki"
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
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Krótki opis problemu, objawów i okoliczności wystąpienia."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={sevId} className="text-sm text-slate-600">
                Priorytet
              </label>
              <select
                id={sevId}
                value={severity}
                onChange={(event) =>
                  setSeverity(Number(event.target.value) as FailureSeverity)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={FailureSeverity.Critical}>Krytyczny</option>
                <option value={FailureSeverity.High}>Wysoki</option>
                <option value={FailureSeverity.Medium}>Średni</option>
                <option value={FailureSeverity.Low}>Niski</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={machId} className="text-sm text-slate-600">
                Maszyna
              </label>
              <select
                id={machId}
                value={machineId}
                onChange={(event) => setMachineId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Brak / nie dotyczy</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={causeId} className="text-sm text-slate-600">
                Kategoria przyczyny
              </label>
              <select
                id={causeId}
                value={causeCategoryId}
                onChange={(event) => setCauseCategoryId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Nieokreślona</option>
                {causeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={causesDowntime}
                onChange={(event) => setCausesDowntime(event.target.checked)}
              />
              Powoduje przestój
            </label>

            <div className="flex flex-col gap-1">
              <label htmlFor={lossId} className="text-sm text-slate-600">
                Strata produkcji [szt. / jednostki]
              </label>
              <input
                id={lossId}
                type="number"
                min="0"
                step="0.01"
                value={productionLossUnits}
                onChange={(event) => setProductionLossUnits(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="np. 120"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={rootCauseId} className="text-sm text-slate-600">
                Przyczyna źródłowa
              </label>
              <textarea
                id={rootCauseId}
                value={rootCause}
                onChange={(event) => setRootCause(event.target.value)}
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Co było najbardziej prawdopodobną przyczyną?"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={correctiveActionId} className="text-sm text-slate-600">
                Działanie korygujące
              </label>
              <textarea
                id={correctiveActionId}
                value={correctiveAction}
                onChange={(event) => setCorrectiveAction(event.target.value)}
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Co trzeba zrobić teraz, aby wrócić do pracy?"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={preventiveActionId} className="text-sm text-slate-600">
                Działanie zapobiegawcze
              </label>
              <textarea
                id={preventiveActionId}
                value={preventiveAction}
                onChange={(event) => setPreventiveAction(event.target.value)}
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Jak ograniczyć ryzyko powtórzenia problemu?"
              />
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
