import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ApiError } from "../../../../shared/api/httpClient";
import { failureReportsApi } from "../../../incidents/api/failureReportsApi";
import { FailureSeverity } from "../../../incidents/api/contracts";
import {
  WorkOrderPriority,
  WorkOrderType,
} from "../../../work-orders/api/contracts";
import { workOrdersApi } from "../../../work-orders/api/workOrdersApi";
import {
  MaintenanceTriggerMode,
  type MaintenanceCalendarOccurrenceDto,
} from "../../api/contracts";
import { maintenancePlansApi } from "../../api/maintenancePlansApi";

type Props = {
  open: boolean;
  occurrence: MaintenanceCalendarOccurrenceDto | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type ConditionState = "ok" | "observation" | "action";

type ChecklistItemState = {
  label: string;
  checked: boolean;
};

function toLocalInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseChecklist(value?: string | null) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean)
    .map((label) => ({ label, checked: true }));
}

export function CompleteMaintenanceModal({
  open,
  occurrence,
  onClose,
  onSaved,
}: Props) {
  const [completedAt, setCompletedAt] = useState("");
  const [actualMinutes, setActualMinutes] = useState("");
  const [scheduledMeterValue, setScheduledMeterValue] = useState("");
  const [notes, setNotes] = useState("");
  const [conditionState, setConditionState] = useState<ConditionState>("ok");
  const [checklistItems, setChecklistItems] = useState<ChecklistItemState[]>([]);
  const [createWorkOrder, setCreateWorkOrder] = useState(false);
  const [createIncident, setCreateIncident] = useState(false);
  const [followUpSummary, setFollowUpSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !occurrence) return;

    setCompletedAt(toLocalInputValue(new Date()));
    setActualMinutes(
      occurrence.estimatedDurationMinutes
        ? String(occurrence.estimatedDurationMinutes)
        : ""
    );
    setScheduledMeterValue(
      occurrence.scheduledMeterValue != null
        ? String(occurrence.scheduledMeterValue)
        : ""
    );
    setNotes("");
    setConditionState("ok");
    setChecklistItems(parseChecklist(occurrence.checklist));
    setCreateWorkOrder(false);
    setCreateIncident(false);
    setFollowUpSummary("");
    setSaving(false);
    setError("");
  }, [occurrence, open]);

  const checkedCount = useMemo(
    () => checklistItems.filter((item) => item.checked).length,
    [checklistItems]
  );

  if (!open || !occurrence) return null;

  const shouldRecommendFollowUp =
    conditionState !== "ok" || checklistItems.some((item) => !item.checked);

  const checklistSummary = checklistItems.length
    ? `Checklista: ${checkedCount}/${checklistItems.length} pozycji wykonanych.`
    : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if ((createWorkOrder || createIncident) && !followUpSummary.trim()) {
      setError("Opisz obserwację albo działanie wymagające follow-upu.");
      return;
    }

    setSaving(true);
    setError("");

    const noteBlocks = [
      `Wynik przeglądu: ${
        conditionState === "ok"
          ? "OK"
          : conditionState === "observation"
            ? "obserwacja"
            : "wymaga działania"
      }`,
      checklistSummary,
      checklistItems.length > 0
        ? `Pozycje niewykonane: ${checklistItems
            .filter((item) => !item.checked)
            .map((item) => item.label)
            .join(", ") || "brak"}`
        : null,
      notes.trim() || null,
      followUpSummary.trim() ? `Follow-up: ${followUpSummary.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await maintenancePlansApi.complete(occurrence.planId, {
        scheduledForUtc: occurrence.scheduledForUtc,
        scheduledMeterValue:
          occurrence.triggerMode === MaintenanceTriggerMode.Meter &&
          scheduledMeterValue.trim()
            ? Number(scheduledMeterValue)
            : null,
        completedAtUtc: completedAt ? new Date(completedAt).toISOString() : null,
        completedByEmployeeId: null,
        actualMinutes: actualMinutes.trim() ? Number(actualMinutes) : null,
        notes: noteBlocks || null,
      });

      if (createWorkOrder) {
        await workOrdersApi.create({
          number: `WO-${Date.now()}`,
          title: `Follow-up po przeglądzie: ${occurrence.planTitle}`,
          description: followUpSummary.trim(),
          type: WorkOrderType.CorrectiveMaintenance,
          priority:
            conditionState === "action"
              ? WorkOrderPriority.High
              : WorkOrderPriority.Medium,
          failureReportId: null,
          assetId: occurrence.assetId,
          hallId: null,
          sectionId: null,
          requestedByEmployeeId: null,
          assignedToEmployeeId: null,
          dueAtUtc: completedAt ? new Date(completedAt).toISOString() : null,
          estimatedMinutes: actualMinutes.trim() ? Number(actualMinutes) : null,
          estimatedCost: null,
          externalVendor: null,
        });
      }

      if (createIncident) {
        await failureReportsApi.create({
          title: `Obserwacja po przeglądzie: ${occurrence.planTitle}`,
          description: followUpSummary.trim(),
          severity:
            conditionState === "action"
              ? FailureSeverity.High
              : FailureSeverity.Medium,
          causesDowntime: false,
          assetId: occurrence.assetId,
          hallId: null,
          sectionId: null,
          reportedByEmployeeId: null,
          failureCauseCategoryId: null,
          downtimeStartedAtUtc: null,
          downtimeEndedAtUtc: null,
          productionLossUnits: null,
          rootCause: null,
          correctiveAction: null,
          preventiveAction: null,
        });
      }

      await onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się oznaczyć przeglądu jako wykonanego.");
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
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Oznacz przegląd jako wykonany
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <div className="font-medium text-slate-900">{occurrence.planTitle}</div>
            <div className="text-slate-600">{occurrence.assetName}</div>
            <div className="mt-1 text-xs text-slate-500">
              Planowany termin: {format(new Date(occurrence.scheduledForUtc), "dd.MM.yyyy HH:mm")}
            </div>
            {occurrence.triggerMode === MaintenanceTriggerMode.Meter ? (
              <div className="mt-1 text-xs text-slate-500">
                Próg licznika: {occurrence.scheduledMeterValue ?? "-"}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Wykonano o</span>
              <input
                type="datetime-local"
                value={completedAt}
                onChange={(event) => setCompletedAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Rzeczywisty czas [min]</span>
              <input
                type="number"
                min={0}
                value={actualMinutes}
                onChange={(event) => setActualMinutes(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {occurrence.triggerMode === MaintenanceTriggerMode.Meter ? (
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Stan licznika przy wykonaniu</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={scheduledMeterValue}
                onChange={(event) => setScheduledMeterValue(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          ) : null}

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-900">Wynik przeglądu</div>
                <div className="text-xs text-slate-500">
                  Zaznacz stan po wykonaniu, aby łatwo uruchomić dalsze działania.
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {checklistItems.length > 0
                  ? `${checkedCount}/${checklistItems.length} pozycji`
                  : "Bez checklisty"}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-3">
              {[
                { value: "ok", label: "OK", description: "Brak odchyleń" },
                {
                  value: "observation",
                  label: "Obserwacja",
                  description: "Warto obserwować trend",
                },
                {
                  value: "action",
                  label: "Wymaga działania",
                  description: "Konieczne kolejne kroki",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={[
                    "rounded-lg border px-3 py-3 text-sm",
                    conditionState === option.value
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="conditionState"
                    value={option.value}
                    checked={conditionState === option.value}
                    onChange={(event) =>
                      setConditionState(event.target.value as ConditionState)
                    }
                  />
                  <div className="font-medium text-slate-900">{option.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{option.description}</div>
                </label>
              ))}
            </div>
          </div>

          {checklistItems.length > 0 ? (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 text-sm font-medium text-slate-900">Checklista wykonania</div>
              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <label
                    key={`${item.label}-${index}`}
                    className="flex items-start gap-3 rounded-lg border border-slate-100 px-3 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(event) =>
                        setChecklistItems((current) =>
                          current.map((entry, entryIndex) =>
                            entryIndex === index
                              ? { ...entry, checked: event.target.checked }
                              : entry
                          )
                        )
                      }
                    />
                    <span className="text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Notatki z wykonania</span>
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Wyniki pomiarów, uwagi z inspekcji, odchylenia, zużyte części."
            />
          </label>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 text-sm font-medium text-slate-900">Dalsze działania</div>
            <div className="text-xs text-slate-500">
              {shouldRecommendFollowUp
                ? "Warto utworzyć follow-up, bo są odchylenia albo niewykonane punkty checklisty."
                : "Nie ma obowiązku tworzenia dodatkowych działań, ale możesz to zrobić od razu."}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createWorkOrder}
                  onChange={(event) => setCreateWorkOrder(event.target.checked)}
                />
                Utwórz zlecenie serwisowe
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={createIncident}
                  onChange={(event) => setCreateIncident(event.target.checked)}
                />
                Utwórz zgłoszenie awarii / obserwację
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-sm text-slate-600">Opis follow-upu</span>
              <textarea
                rows={3}
                value={followUpSummary}
                onChange={(event) => setFollowUpSummary(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Co wymaga dalszego działania, jaka część wymaga wymiany, jaki symptom zauważono?"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Zapisywanie..." : "Zapisz wykonanie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
