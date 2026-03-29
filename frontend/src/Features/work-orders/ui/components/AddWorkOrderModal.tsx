import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import type { AssetListItemDto } from "../../../machines/api/contracts";
import {
  WorkOrderPriority,
  WorkOrderType,
  type WorkOrderDto,
} from "../../api/contracts";
import { workOrdersApi } from "../../api/workOrdersApi";

type Props = {
  open: boolean;
  onClose: () => void;
  assets: AssetListItemDto[];
  onCreated: (workOrder: WorkOrderDto) => void;
};

export function AddWorkOrderModal({
  open,
  onClose,
  assets,
  onCreated,
}: Props) {
  const numberId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const typeId = useId();
  const priorityId = useId();
  const assetId = useId();
  const dueAtId = useId();

  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkOrderType>(
    WorkOrderType.CorrectiveMaintenance
  );
  const [priority, setPriority] = useState<WorkOrderPriority>(
    WorkOrderPriority.Medium
  );
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setNumber(`WO-${Date.now()}`);
    setTitle("");
    setDescription("");
    setType(WorkOrderType.CorrectiveMaintenance);
    setPriority(WorkOrderPriority.Medium);
    setSelectedAssetId("");
    setDueAt("");
    setError("");
    setSaving(false);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!number.trim()) {
      setError("Numer zlecenia jest wymagany.");
      return;
    }

    if (!title.trim()) {
      setError("Tytuł zlecenia jest wymagany.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await workOrdersApi.create({
        number: number.trim(),
        title: title.trim(),
        description: description.trim() || title.trim(),
        type,
        priority,
        failureReportId: null,
        assetId: selectedAssetId || null,
        hallId: null,
        sectionId: null,
        requestedByEmployeeId: null,
        assignedToEmployeeId: null,
        dueAtUtc: dueAt ? new Date(dueAt).toISOString() : null,
        estimatedMinutes: null,
        estimatedCost: null,
        externalVendor: null,
      });

      onCreated(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się zapisać zlecenia.");
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
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">Nowe zlecenie serwisowe</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={numberId} className="text-sm text-slate-600">
                Numer <span className="text-rose-600">*</span>
              </label>
              <input
                id={numberId}
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={dueAtId} className="text-sm text-slate-600">
                Termin
              </label>
              <input
                id={dueAtId}
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={titleId} className="text-sm text-slate-600">
              Tytuł <span className="text-rose-600">*</span>
            </label>
            <input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              placeholder="np. Wymiana czujnika położenia"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={descriptionId} className="text-sm text-slate-600">
              Opis
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              placeholder="Zakres prac albo krótki kontekst zlecenia..."
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={typeId} className="text-sm text-slate-600">
                Typ
              </label>
              <select
                id={typeId}
                value={type}
                onChange={(event) =>
                  setType(Number(event.target.value) as WorkOrderType)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value={WorkOrderType.CorrectiveMaintenance}>
                  Utrzymanie korygujące
                </option>
                <option value={WorkOrderType.PreventiveMaintenance}>
                  Utrzymanie zapobiegawcze
                </option>
                <option value={WorkOrderType.Inspection}>Inspekcja</option>
                <option value={WorkOrderType.Installation}>Instalacja</option>
                <option value={WorkOrderType.Relocation}>Relokacja</option>
                <option value={WorkOrderType.Other}>Inne</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={priorityId} className="text-sm text-slate-600">
                Priorytet
              </label>
              <select
                id={priorityId}
                value={priority}
                onChange={(event) =>
                  setPriority(Number(event.target.value) as WorkOrderPriority)
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value={WorkOrderPriority.Critical}>Krytyczny</option>
                <option value={WorkOrderPriority.High}>Wysoki</option>
                <option value={WorkOrderPriority.Medium}>Średni</option>
                <option value={WorkOrderPriority.Low}>Niski</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={assetId} className="text-sm text-slate-600">
              Maszyna
            </label>
            <select
              id={assetId}
              value={selectedAssetId}
              onChange={(event) => setSelectedAssetId(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
            >
              <option value="">Brak/nie dotyczy</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                </option>
              ))}
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
