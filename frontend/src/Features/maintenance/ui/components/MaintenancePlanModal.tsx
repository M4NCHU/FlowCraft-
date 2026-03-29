import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import {
  AssetMeterType,
  type AssetListItemDto,
} from "../../../machines/api/contracts";
import {
  MaintenanceRecurrenceUnit,
  MaintenanceScheduleType,
  MaintenanceTriggerMode,
  type MaintenancePlanDto,
} from "../../api/contracts";
import { maintenancePlansApi } from "../../api/maintenancePlansApi";

type Props = {
  open: boolean;
  machines: AssetListItemDto[];
  initialPlan?: MaintenancePlanDto | null;
  preselectedAssetId?: string;
  initialStartsAt?: Date | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

const recurrenceOptions = [
  { value: MaintenanceRecurrenceUnit.Day, label: "dni" },
  { value: MaintenanceRecurrenceUnit.Week, label: "tygodni" },
  { value: MaintenanceRecurrenceUnit.Month, label: "miesięcy" },
  { value: MaintenanceRecurrenceUnit.Quarter, label: "kwartałów" },
  { value: MaintenanceRecurrenceUnit.Year, label: "lat" },
] as const;

const meterOptions = [
  { value: AssetMeterType.OperatingHours, label: "Godziny pracy" },
  { value: AssetMeterType.ProductionCycles, label: "Cykle produkcyjne" },
  { value: AssetMeterType.ProducedBatches, label: "Partie produkcyjne" },
] as const;

function toLocalInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function MaintenancePlanModal({
  open,
  machines,
  initialPlan,
  preselectedAssetId,
  initialStartsAt,
  onClose,
  onSaved,
}: Props) {
  const [assetId, setAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleType, setScheduleType] = useState<MaintenanceScheduleType>(
    MaintenanceScheduleType.Recurring
  );
  const [triggerMode, setTriggerMode] = useState<MaintenanceTriggerMode>(
    MaintenanceTriggerMode.Calendar
  );
  const [startsAt, setStartsAt] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceUnit, setRecurrenceUnit] =
    useState<MaintenanceRecurrenceUnit>(MaintenanceRecurrenceUnit.Month);
  const [meterType, setMeterType] = useState<AssetMeterType>(AssetMeterType.OperatingHours);
  const [meterInterval, setMeterInterval] = useState("1000");
  const [startsAtMeterValue, setStartsAtMeterValue] = useState("");
  const [autoCreateLeadMeterValue, setAutoCreateLeadMeterValue] = useState("");
  const [autoCreateWorkOrder, setAutoCreateWorkOrder] = useState(true);
  const [leadTimeDays, setLeadTimeDays] = useState("14");
  const [estimatedDurationMinutes, setEstimatedDurationMinutes] = useState("");
  const [checklist, setChecklist] = useState("");
  const [instructions, setInstructions] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const fallbackStart =
      initialStartsAt ??
      (() => {
        const now = new Date();
        now.setHours(8, 0, 0, 0);
        return now;
      })();

    setAssetId(initialPlan?.assetId ?? preselectedAssetId ?? "");
    setTitle(initialPlan?.title ?? "");
    setDescription(initialPlan?.description ?? "");
    setScheduleType(
      initialPlan?.scheduleType ?? MaintenanceScheduleType.Recurring
    );
    setTriggerMode(
      initialPlan?.triggerMode ?? MaintenanceTriggerMode.Calendar
    );
    setStartsAt(
      initialPlan?.startsAtUtc
        ? toLocalInputValue(new Date(initialPlan.startsAtUtc))
        : toLocalInputValue(fallbackStart)
    );
    setRecurrenceInterval(String(initialPlan?.recurrenceInterval ?? 1));
    setRecurrenceUnit(
      initialPlan?.recurrenceUnit ?? MaintenanceRecurrenceUnit.Month
    );
    setMeterType(initialPlan?.meterType ?? AssetMeterType.OperatingHours);
    setMeterInterval(initialPlan?.meterInterval ? String(initialPlan.meterInterval) : "1000");
    setStartsAtMeterValue(
      initialPlan?.lastCompletedMeterValue != null
        ? String(initialPlan.lastCompletedMeterValue)
        : ""
    );
    setAutoCreateLeadMeterValue(
      initialPlan?.autoCreateLeadMeterValue != null
        ? String(initialPlan.autoCreateLeadMeterValue)
        : ""
    );
    setAutoCreateWorkOrder(initialPlan?.autoCreateWorkOrder ?? true);
    setLeadTimeDays(String(initialPlan?.leadTimeDays ?? 14));
    setEstimatedDurationMinutes(
      initialPlan?.estimatedDurationMinutes
        ? String(initialPlan.estimatedDurationMinutes)
        : ""
    );
    setChecklist(initialPlan?.checklist ?? "");
    setInstructions(initialPlan?.instructions ?? "");
    setIsActive(initialPlan?.isActive ?? true);
    setSaving(false);
    setError("");
  }, [initialPlan, initialStartsAt, open, preselectedAssetId]);

  const titleLabel = initialPlan
    ? "Edytuj plan przeglądu"
    : "Nowy plan przeglądu";

  const canSubmit = useMemo(() => {
    if (!assetId || !title.trim()) return false;
    if (triggerMode === MaintenanceTriggerMode.Calendar) {
      if (!startsAt) return false;
      return scheduleType === MaintenanceScheduleType.OneTime || Number(recurrenceInterval) > 0;
    }

    return scheduleType === MaintenanceScheduleType.OneTime || Number(meterInterval) > 0;
  }, [assetId, meterInterval, recurrenceInterval, scheduleType, startsAt, title, triggerMode]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      setError("Uzupełnij wymagane pola planu przeglądu.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      assetId,
      assignedToEmployeeId: null,
      title: title.trim(),
      description: description.trim() || null,
      scheduleType,
      triggerMode,
      startsAtUtc: new Date(startsAt || new Date()).toISOString(),
      recurrenceUnit:
        triggerMode === MaintenanceTriggerMode.Calendar &&
        scheduleType === MaintenanceScheduleType.Recurring
          ? recurrenceUnit
          : null,
      recurrenceInterval:
        triggerMode === MaintenanceTriggerMode.Calendar &&
        scheduleType === MaintenanceScheduleType.Recurring
          ? Number(recurrenceInterval)
          : null,
      meterType: triggerMode === MaintenanceTriggerMode.Meter ? meterType : null,
      meterInterval:
        triggerMode === MaintenanceTriggerMode.Meter &&
        scheduleType === MaintenanceScheduleType.Recurring
          ? Number(meterInterval)
          : null,
      startsAtMeterValue:
        triggerMode === MaintenanceTriggerMode.Meter && startsAtMeterValue.trim()
          ? Number(startsAtMeterValue)
          : null,
      autoCreateLeadMeterValue:
        triggerMode === MaintenanceTriggerMode.Meter && autoCreateLeadMeterValue.trim()
          ? Number(autoCreateLeadMeterValue)
          : null,
      autoCreateWorkOrder,
      leadTimeDays: Math.max(0, Number(leadTimeDays) || 0),
      estimatedDurationMinutes: estimatedDurationMinutes.trim()
        ? Number(estimatedDurationMinutes)
        : null,
      checklist: checklist.trim() || null,
      instructions: instructions.trim() || null,
    };

    try {
      if (initialPlan) {
        await maintenancePlansApi.update(initialPlan.id, {
          ...payload,
          isActive,
        });
      } else {
        await maintenancePlansApi.create(payload);
      }

      await onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się zapisać planu przeglądu.");
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
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{titleLabel}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">
                Maszyna <span className="text-rose-600">*</span>
              </span>
              <select
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Wybierz maszynę</option>
                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} ({machine.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">
                Nazwa planu <span className="text-rose-600">*</span>
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="np. Roczny przegląd bezpieczeństwa"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">Opis</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Zakres przeglądu, wymagania BHP, kryteria odbioru..."
            />
          </label>

          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 text-sm font-medium text-slate-900">
                Tryb wyzwalania
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    checked={triggerMode === MaintenanceTriggerMode.Calendar}
                    onChange={() => setTriggerMode(MaintenanceTriggerMode.Calendar)}
                  />
                  Kalendarz
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    checked={triggerMode === MaintenanceTriggerMode.Meter}
                    onChange={() => setTriggerMode(MaintenanceTriggerMode.Meter)}
                  />
                  Licznik eksploatacyjny
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    checked={scheduleType === MaintenanceScheduleType.OneTime}
                    onChange={() => setScheduleType(MaintenanceScheduleType.OneTime)}
                  />
                  Jednorazowy
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    checked={scheduleType === MaintenanceScheduleType.Recurring}
                    onChange={() => setScheduleType(MaintenanceScheduleType.Recurring)}
                  />
                  Cykliczny
                </label>
              </div>

              {triggerMode === MaintenanceTriggerMode.Calendar ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600">
                      Pierwszy termin <span className="text-rose-600">*</span>
                    </span>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  {scheduleType === MaintenanceScheduleType.Recurring ? (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <label className="flex flex-col gap-1">
                        <span className="text-sm text-slate-600">Co ile</span>
                        <input
                          type="number"
                          min={1}
                          value={recurrenceInterval}
                          onChange={(event) =>
                            setRecurrenceInterval(event.target.value)
                          }
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-sm text-slate-600">Jednostka</span>
                        <select
                          value={recurrenceUnit}
                          onChange={(event) =>
                            setRecurrenceUnit(
                              Number(event.target.value) as MaintenanceRecurrenceUnit
                            )
                          }
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        >
                          {recurrenceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                      Plan pojawi się tylko raz w kalendarzu.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600">Typ licznika</span>
                    <select
                      value={meterType}
                      onChange={(event) =>
                        setMeterType(Number(event.target.value) as AssetMeterType)
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {meterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600">Wartość bazowa licznika</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={startsAtMeterValue}
                      onChange={(event) => setStartsAtMeterValue(event.target.value)}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="np. 1200"
                    />
                  </label>

                  {scheduleType === MaintenanceScheduleType.Recurring ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">Interwał licznika</span>
                      <input
                        type="number"
                        min={1}
                        step="0.01"
                        value={meterInterval}
                        onChange={(event) => setMeterInterval(event.target.value)}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="np. 1000"
                      />
                    </label>
                  ) : null}

                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-slate-600">Próg automatycznego zlecenia</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={autoCreateLeadMeterValue}
                      onChange={(event) =>
                        setAutoCreateLeadMeterValue(event.target.value)
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="np. 50"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 text-sm font-medium text-slate-900">
                Ustawienia operacyjne
              </div>

              <div className="space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-slate-600">
                    Wyprzedzenie [dni]
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={leadTimeDays}
                    onChange={(event) => setLeadTimeDays(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm text-slate-600">
                    Szacowany czas [min]
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={estimatedDurationMinutes}
                    onChange={(event) =>
                      setEstimatedDurationMinutes(event.target.value)
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoCreateWorkOrder}
                    onChange={(event) => setAutoCreateWorkOrder(event.target.checked)}
                  />
                  Twórz automatyczne zlecenie serwisowe
                </label>

                {initialPlan ? (
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                    />
                    Plan aktywny
                  </label>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Checklista</span>
              <textarea
                value={checklist}
                onChange={(event) => setChecklist(event.target.value)}
                rows={5}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="np. Kontrola osłon, smarowanie, test czujników..."
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-600">Instrukcje</span>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={5}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Dodatkowe wskazówki dla technika lub brygadzisty..."
              />
            </label>
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
              disabled={!canSubmit || saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Zapisywanie..." : initialPlan ? "Zapisz zmiany" : "Dodaj plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}