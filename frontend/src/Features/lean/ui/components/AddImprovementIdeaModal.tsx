import { useEffect, useId, useMemo, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import type { DepartmentDto } from "../../../departments/api/contracts";
import type { EmployeeDto } from "../../../employees/api/contracts";
import { improvementIdeasApi } from "../../api/improvementIdeasApi";
import {
  ImprovementCategory,
  ImprovementImpact,
  type ImprovementIdeaDto,
  LeanWasteType,
} from "../../api/contracts";

type CreateIdeaPrefill = {
  title?: string;
  description?: string;
  departmentId?: string;
  ownerEmployeeId?: string;
  category?: ImprovementCategory;
  wasteType?: LeanWasteType;
  impact?: ImprovementImpact;
  quickWin?: boolean;
  proposedAction?: string;
  estimatedSavingsPerMonth?: number | null;
  dueDateUtc?: string | null;
  baselineMetricName?: string;
  metricUnit?: string;
  baselineValue?: number | null;
  targetValue?: number | null;
  notes?: string;
};

type Props = {
  open: boolean;
  departments: DepartmentDto[];
  employees: EmployeeDto[];
  idea?: ImprovementIdeaDto | null;
  prefill?: CreateIdeaPrefill | null;
  onClose: () => void;
  onCreated?: (idea: ImprovementIdeaDto) => void;
  onUpdated?: (idea: ImprovementIdeaDto) => void;
};

const categoryOptions = [
  { value: ImprovementCategory.Kaizen, label: "Kaizen" },
  { value: ImprovementCategory.FiveS, label: "5S" },
  { value: ImprovementCategory.StandardWork, label: "Standard work" },
  { value: ImprovementCategory.Flow, label: "Przepływ" },
  { value: ImprovementCategory.Safety, label: "Bezpieczeństwo" },
  { value: ImprovementCategory.Quality, label: "Jakość" },
];

const wasteOptions = [
  { value: LeanWasteType.Transport, label: "Transport" },
  { value: LeanWasteType.Inventory, label: "Zapasy" },
  { value: LeanWasteType.Motion, label: "Ruch" },
  { value: LeanWasteType.Waiting, label: "Oczekiwanie" },
  { value: LeanWasteType.Overproduction, label: "Nadprodukcja" },
  { value: LeanWasteType.Overprocessing, label: "Nadmierne przetwarzanie" },
  { value: LeanWasteType.Defects, label: "Braki jakościowe" },
  { value: LeanWasteType.UnusedTalent, label: "Niewykorzystany potencjał" },
];

const impactOptions = [
  { value: ImprovementImpact.Low, label: "Niski" },
  { value: ImprovementImpact.Medium, label: "Średni" },
  { value: ImprovementImpact.High, label: "Wysoki" },
  { value: ImprovementImpact.Critical, label: "Krytyczny" },
];

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function AddImprovementIdeaModal({
  open,
  departments,
  employees,
  idea,
  prefill,
  onClose,
  onCreated,
  onUpdated,
}: Props) {
  const isEditMode = !!idea;
  const titleId = useId();
  const departmentId = useId();
  const ownerId = useId();
  const descriptionId = useId();
  const categoryId = useId();
  const wasteId = useId();
  const impactId = useId();
  const proposedActionId = useId();
  const estimatedSavingsId = useId();
  const dueDateId = useId();
  const baselineMetricId = useId();
  const baselineValueId = useId();
  const targetValueId = useId();
  const actualValueId = useId();
  const metricUnitId = useId();
  const implementedSavingsId = useId();
  const rootCauseId = useId();
  const resultSummaryId = useId();
  const notesId = useId();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [category, setCategory] = useState(ImprovementCategory.Kaizen);
  const [wasteType, setWasteType] = useState(LeanWasteType.Waiting);
  const [impact, setImpact] = useState(ImprovementImpact.Medium);
  const [quickWin, setQuickWin] = useState(false);
  const [proposedAction, setProposedAction] = useState("");
  const [estimatedSavings, setEstimatedSavings] = useState("");
  const [implementedSavings, setImplementedSavings] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [baselineMetricName, setBaselineMetricName] = useState("");
  const [metricUnit, setMetricUnit] = useState("");
  const [baselineValue, setBaselineValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [actualValue, setActualValue] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [resultSummary, setResultSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (idea) {
      setTitle(idea.title);
      setDescription(idea.description);
      setSelectedDepartmentId(idea.departmentId ?? "");
      setSelectedOwnerId(idea.ownerEmployeeId ?? "");
      setCategory(idea.category);
      setWasteType(idea.wasteType);
      setImpact(idea.impact);
      setQuickWin(idea.quickWin);
      setProposedAction(idea.proposedAction ?? "");
      setEstimatedSavings(
        idea.estimatedSavingsPerMonth != null
          ? String(idea.estimatedSavingsPerMonth)
          : ""
      );
      setImplementedSavings(
        idea.implementedSavingsPerMonth != null
          ? String(idea.implementedSavingsPerMonth)
          : ""
      );
      setDueDate(toDateInputValue(idea.dueDateUtc));
      setBaselineMetricName(idea.baselineMetricName ?? "");
      setMetricUnit(idea.metricUnit ?? "");
      setBaselineValue(
        idea.baselineValue != null ? String(idea.baselineValue) : ""
      );
      setTargetValue(idea.targetValue != null ? String(idea.targetValue) : "");
      setActualValue(idea.actualValue != null ? String(idea.actualValue) : "");
      setRootCause(idea.rootCause ?? "");
      setResultSummary(idea.resultSummary ?? "");
      setNotes(idea.notes ?? "");
    } else {
      setTitle(prefill?.title ?? "");
      setDescription(prefill?.description ?? "");
      setSelectedDepartmentId(prefill?.departmentId ?? "");
      setSelectedOwnerId(prefill?.ownerEmployeeId ?? "");
      setCategory(prefill?.category ?? ImprovementCategory.Kaizen);
      setWasteType(prefill?.wasteType ?? LeanWasteType.Waiting);
      setImpact(prefill?.impact ?? ImprovementImpact.Medium);
      setQuickWin(prefill?.quickWin ?? false);
      setProposedAction(prefill?.proposedAction ?? "");
      setEstimatedSavings(
        prefill?.estimatedSavingsPerMonth != null
          ? String(prefill.estimatedSavingsPerMonth)
          : ""
      );
      setImplementedSavings("");
      setDueDate(toDateInputValue(prefill?.dueDateUtc));
      setBaselineMetricName(prefill?.baselineMetricName ?? "");
      setMetricUnit(prefill?.metricUnit ?? "");
      setBaselineValue(
        prefill?.baselineValue != null ? String(prefill.baselineValue) : ""
      );
      setTargetValue(
        prefill?.targetValue != null ? String(prefill.targetValue) : ""
      );
      setActualValue("");
      setRootCause("");
      setResultSummary("");
      setNotes(prefill?.notes ?? "");
    }

    setError("");
    setSaving(false);
  }, [idea, open, prefill]);

  const modalTitle = useMemo(
    () => (isEditMode ? "Edytuj usprawnienie" : "Dodaj usprawnienie"),
    [isEditMode]
  );

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Tytuł usprawnienia jest wymagany.");
      return;
    }

    if (!description.trim()) {
      setError("Opis problemu lub szansy jest wymagany.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (idea) {
        const updated = await improvementIdeasApi.update(idea.id, {
          title: title.trim(),
          description: description.trim(),
          departmentId: selectedDepartmentId || null,
          ownerEmployeeId: selectedOwnerId || null,
          category,
          wasteType,
          impact,
          quickWin,
          rootCause: rootCause.trim() || null,
          proposedAction: proposedAction.trim() || null,
          baselineMetricName: baselineMetricName.trim() || null,
          metricUnit: metricUnit.trim() || null,
          baselineValue: baselineValue.trim() ? Number(baselineValue) : null,
          targetValue: targetValue.trim() ? Number(targetValue) : null,
          actualValue: actualValue.trim() ? Number(actualValue) : null,
          estimatedSavingsPerMonth: estimatedSavings.trim()
            ? Number(estimatedSavings)
            : null,
          implementedSavingsPerMonth: implementedSavings.trim()
            ? Number(implementedSavings)
            : null,
          resultSummary: resultSummary.trim() || null,
          dueDateUtc: dueDate
            ? new Date(`${dueDate}T00:00:00`).toISOString()
            : null,
          notes: notes.trim() || null,
        });

        onUpdated?.(updated);
      } else {
        const created = await improvementIdeasApi.create({
          title: title.trim(),
          description: description.trim(),
          departmentId: selectedDepartmentId || null,
          ownerEmployeeId: selectedOwnerId || null,
          category,
          wasteType,
          impact,
          quickWin,
          proposedAction: proposedAction.trim() || null,
          baselineMetricName: baselineMetricName.trim() || null,
          metricUnit: metricUnit.trim() || null,
          baselineValue: baselineValue.trim() ? Number(baselineValue) : null,
          targetValue: targetValue.trim() ? Number(targetValue) : null,
          estimatedSavingsPerMonth: estimatedSavings.trim()
            ? Number(estimatedSavings)
            : null,
          dueDateUtc: dueDate
            ? new Date(`${dueDate}T00:00:00`).toISOString()
            : null,
          notes: notes.trim() || null,
        });

        onCreated?.(created);
      }

      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          isEditMode
            ? "Nie udało się zapisać usprawnienia."
            : "Nie udało się dodać usprawnienia."
        );
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
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">{modalTitle}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor={titleId} className="text-sm text-slate-600">
                Tytuł <span className="text-rose-600">*</span>
              </label>
              <input
                id={titleId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="np. Skrócenie czasu przezbrojenia stanowiska testowego"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={departmentId} className="text-sm text-slate-600">
                Dział
              </label>
              <select
                id={departmentId}
                value={selectedDepartmentId}
                onChange={(event) => setSelectedDepartmentId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Bez przypisania</option>
                {departments
                  .filter((department) => department.isActive)
                  .map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={ownerId} className="text-sm text-slate-600">
                Właściciel
              </label>
              <select
                id={ownerId}
                value={selectedOwnerId}
                onChange={(event) => setSelectedOwnerId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Bez przypisania</option>
                {employees
                  .filter((employee) => employee.isActive)
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor={descriptionId} className="text-sm text-slate-600">
                Opis problemu / szansy <span className="text-rose-600">*</span>
              </label>
              <textarea
                id={descriptionId}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Co dziś powoduje stratę, ryzyko lub ogranicza przepływ?"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={categoryId} className="text-sm text-slate-600">
                Kategoria
              </label>
              <select
                id={categoryId}
                value={category}
                onChange={(event) =>
                  setCategory(Number(event.target.value) as ImprovementCategory)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={wasteId} className="text-sm text-slate-600">
                Typ marnotrawstwa
              </label>
              <select
                id={wasteId}
                value={wasteType}
                onChange={(event) =>
                  setWasteType(Number(event.target.value) as LeanWasteType)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {wasteOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={impactId} className="text-sm text-slate-600">
                Wpływ
              </label>
              <select
                id={impactId}
                value={impact}
                onChange={(event) =>
                  setImpact(Number(event.target.value) as ImprovementImpact)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {impactOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={quickWin}
                onChange={(event) => setQuickWin(event.target.checked)}
              />
              Quick win
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={proposedActionId} className="text-sm text-slate-600">
                Proponowane działanie
              </label>
              <textarea
                id={proposedActionId}
                value={proposedAction}
                onChange={(event) => setProposedAction(event.target.value)}
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Jakie działanie zmniejszy problem albo poprawi przepływ?"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={notesId} className="text-sm text-slate-600">
                Notatki
              </label>
              <textarea
                id={notesId}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Źródło pomysłu, dane wejściowe, uwagi z gemba."
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor={baselineMetricId} className="text-sm text-slate-600">
                KPI / miernik
              </label>
              <input
                id={baselineMetricId}
                value={baselineMetricName}
                onChange={(event) => setBaselineMetricName(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="np. Czas przezbrojenia"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={metricUnitId} className="text-sm text-slate-600">
                Jednostka
              </label>
              <input
                id={metricUnitId}
                value={metricUnit}
                onChange={(event) => setMetricUnit(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="np. min, %, szt."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={estimatedSavingsId} className="text-sm text-slate-600">
                Szacowane oszczędności / mies.
              </label>
              <input
                id={estimatedSavingsId}
                type="number"
                min="0"
                step="0.01"
                value={estimatedSavings}
                onChange={(event) => setEstimatedSavings(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="np. 1500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={baselineValueId} className="text-sm text-slate-600">
                Stan obecny
              </label>
              <input
                id={baselineValueId}
                type="number"
                step="0.01"
                value={baselineValue}
                onChange={(event) => setBaselineValue(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={targetValueId} className="text-sm text-slate-600">
                Cel
              </label>
              <input
                id={targetValueId}
                type="number"
                step="0.01"
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={dueDateId} className="text-sm text-slate-600">
                Termin
              </label>
              <input
                id={dueDateId}
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {isEditMode ? (
            <div className="grid gap-3 md:grid-cols-2">
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
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={resultSummaryId} className="text-sm text-slate-600">
                  Wynik wdrożenia
                </label>
                <textarea
                  id={resultSummaryId}
                  value={resultSummary}
                  onChange={(event) => setResultSummary(event.target.value)}
                  rows={3}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={actualValueId} className="text-sm text-slate-600">
                  Wynik po wdrożeniu
                </label>
                <input
                  id={actualValueId}
                  type="number"
                  step="0.01"
                  value={actualValue}
                  onChange={(event) => setActualValue(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={implementedSavingsId} className="text-sm text-slate-600">
                  Realne oszczędności / mies.
                </label>
                <input
                  id={implementedSavingsId}
                  type="number"
                  min="0"
                  step="0.01"
                  value={implementedSavings}
                  onChange={(event) => setImplementedSavings(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Zapisywanie..." : isEditMode ? "Zapisz zmiany" : "Dodaj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
