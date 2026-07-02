import { type ReactNode, useEffect, useState } from "react";
import type { CreateInventoryProcurementInput } from "../../model/useInventoryWorkspace";

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Zamknij
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  onSubmit,
  submitLabel,
}: {
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
      <button
        type="button"
        onClick={onClose}
        className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Anuluj
      </button>
      <button
        type="button"
        onClick={onSubmit}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

interface InventoryProcurementModalProps {
  open: boolean;
  items: Array<{
    id: string;
    name: string;
    sku: string;
    supplierName?: string | null;
    categoryId: string;
    unit: string;
  }>;
  departments: { id: string; name: string }[];
  workOrders: { id: string; number: string; title: string }[];
  maintenancePlans: { id: string; title: string }[];
  prefillItemId: string;
  onClose: () => void;
  onSubmit: (input: CreateInventoryProcurementInput) => void;
}

export function InventoryProcurementModal({
  open,
  items,
  departments,
  workOrders,
  maintenancePlans,
  prefillItemId,
  onClose,
  onSubmit,
}: InventoryProcurementModalProps) {
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [supplierName, setSupplierName] = useState("");
  const [requestedByDepartmentId, setRequestedByDepartmentId] = useState("");
  const [linkedWorkOrderId, setLinkedWorkOrderId] = useState("");
  const [linkedMaintenancePlanId, setLinkedMaintenancePlanId] = useState("");
  const [expectedDeliveryAtUtc, setExpectedDeliveryAtUtc] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setItemId(prefillItemId || items[0]?.id || "");
    setQuantity("1");
    setSupplierName("");
    setRequestedByDepartmentId("");
    setLinkedWorkOrderId("");
    setLinkedMaintenancePlanId("");
    setExpectedDeliveryAtUtc("");
    setNotes("");
    setError("");
  }, [items, open, prefillItemId]);

  useEffect(() => {
    if (!open) return;

    const selectedItem = items.find((item) => item.id === itemId);
    if (selectedItem?.supplierName) {
      setSupplierName(selectedItem.supplierName);
    }
  }, [itemId, items, open]);

  if (!open) return null;

  const selectedItem = items.find((item) => item.id === itemId);

  const handleSubmit = () => {
    if (!itemId) {
      setError("Wybierz pozycje magazynowa.");
      return;
    }

    onSubmit({
      itemId,
      quantity: Number(quantity),
      supplierName,
      requestedByDepartmentId: requestedByDepartmentId || null,
      linkedWorkOrderId: linkedWorkOrderId || null,
      linkedMaintenancePlanId: linkedMaintenancePlanId || null,
      expectedDeliveryAtUtc: expectedDeliveryAtUtc || null,
      notes,
    });
  };

  return (
    <ModalShell title="Nowe zaopatrzenie" onClose={onClose}>
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Pozycja">
          <select
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Wybierz pozycje</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ilosc">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      {selectedItem ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          <div className="font-medium text-slate-900">{selectedItem.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            Jednostka: {selectedItem.unit}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Dostawca">
          <input
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="ETA">
          <input
            type="date"
            value={expectedDeliveryAtUtc}
            onChange={(event) => setExpectedDeliveryAtUtc(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Dzial wnioskujacy">
          <select
            value={requestedByDepartmentId}
            onChange={(event) => setRequestedByDepartmentId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Brak</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Powiazane zlecenie">
          <select
            value={linkedWorkOrderId}
            onChange={(event) => setLinkedWorkOrderId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Brak</option>
            {workOrders.map((workOrder) => (
              <option key={workOrder.id} value={workOrder.id}>
                {workOrder.number} - {workOrder.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Powiazany plan">
          <select
            value={linkedMaintenancePlanId}
            onChange={(event) =>
              setLinkedMaintenancePlanId(event.target.value)
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Brak</option>
            {maintenancePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Uwagi">
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Powod zakupu, preferowany termin, wymagania dostawy..."
        />
      </Field>

      <ModalActions
        onClose={onClose}
        onSubmit={handleSubmit}
        submitLabel="Utworz zakup"
      />
    </ModalShell>
  );
}
