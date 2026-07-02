import { type ReactNode, useEffect, useState } from "react";
import type {
  CreateInventoryItemInput,
  InventoryCategory,
  InventoryCriticality,
  InventoryServiceType,
} from "../../model/useInventoryWorkspace";
import { serviceTypeOptions } from "../../model/useInventoryWorkspace";

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

interface InventoryItemModalProps {
  open: boolean;
  categories: InventoryCategory[];
  departments: { id: string; name: string }[];
  machineCategories: { id: string; name: string }[];
  assets: { id: string; name: string; code: string }[];
  onClose: () => void;
  onSubmit: (input: CreateInventoryItemInput) => void;
}

export function InventoryItemModal({
  open,
  categories,
  departments,
  machineCategories,
  assets,
  onClose,
  onSubmit,
}: InventoryItemModalProps) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("szt.");
  const [quantityOnHand, setQuantityOnHand] = useState("0");
  const [quantityReserved, setQuantityReserved] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [reorderQuantity, setReorderQuantity] = useState("0");
  const [leadTimeDays, setLeadTimeDays] = useState("3");
  const [location, setLocation] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [linkedDepartmentId, setLinkedDepartmentId] = useState("");
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [linkedMachineCategoryId, setLinkedMachineCategoryId] = useState("");
  const [criticality, setCriticality] =
    useState<InventoryCriticality>("medium");
  const [serviceType, setServiceType] = useState<InventoryServiceType | "">("");
  const [notes, setNotes] = useState("");
  const [parameterValues, setParameterValues] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setCategoryId(categories[0]?.id ?? "");
    setName("");
    setSku("");
    setUnit("szt.");
    setQuantityOnHand("0");
    setQuantityReserved("0");
    setMinimumStock("0");
    setReorderQuantity("0");
    setLeadTimeDays("3");
    setLocation("");
    setSupplierName("");
    setUnitCost("");
    setLinkedDepartmentId("");
    setLinkedAssetId("");
    setLinkedMachineCategoryId("");
    setCriticality("medium");
    setServiceType("");
    setNotes("");
    setParameterValues({});
    setError("");
  }, [categories, open]);

  const selectedCategory = categories.find((category) => category.id === categoryId);

  useEffect(() => {
    if (!selectedCategory) return;

    setParameterValues((current) => {
      const next: Record<string, string> = {};
      selectedCategory.parameterTemplates.forEach((template) => {
        next[template.code] = current[template.code] ?? "";
      });
      return next;
    });

    if (!supplierName && selectedCategory.defaultSupplier) {
      setSupplierName(selectedCategory.defaultSupplier);
    }

    if (!linkedDepartmentId && selectedCategory.linkedDepartmentId) {
      setLinkedDepartmentId(selectedCategory.linkedDepartmentId);
    }
  }, [linkedDepartmentId, selectedCategory, supplierName]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!categoryId) {
      setError("Wybierz kategorie.");
      return;
    }

    if (!name.trim()) {
      setError("Nazwa pozycji jest wymagana.");
      return;
    }

    if (!sku.trim()) {
      setError("SKU jest wymagane.");
      return;
    }

    onSubmit({
      categoryId,
      name,
      sku,
      unit,
      quantityOnHand: Number(quantityOnHand),
      quantityReserved: Number(quantityReserved),
      minimumStock: Number(minimumStock),
      reorderQuantity: Number(reorderQuantity),
      leadTimeDays: Number(leadTimeDays),
      location,
      supplierName,
      unitCost: unitCost ? Number(unitCost) : null,
      linkedDepartmentId: linkedDepartmentId || null,
      linkedAssetId: linkedAssetId || null,
      linkedMachineCategoryId: linkedMachineCategoryId || null,
      parameterValues,
      criticality,
      serviceType: serviceType || null,
      notes,
    });
  };

  return (
    <ModalShell title="Dodaj pozycje magazynowa" onClose={onClose}>
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Kategoria">
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Wybierz kategorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Krytycznosc">
          <select
            value={criticality}
            onChange={(event) =>
              setCriticality(event.target.value as InventoryCriticality)
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="low">Standard</option>
            <option value="medium">Wazna</option>
            <option value="high">Krytyczna</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nazwa">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="np. Czujnik fotoelektryczny"
          />
        </Field>
        <Field label="SKU / indeks">
          <input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
            placeholder="np. INV-0001"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Jednostka">
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Na stanie">
          <input
            type="number"
            min="0"
            value={quantityOnHand}
            onChange={(event) => setQuantityOnHand(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Zarezerwowane">
          <input
            type="number"
            min="0"
            value={quantityReserved}
            onChange={(event) => setQuantityReserved(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Minimum">
          <input
            type="number"
            min="0"
            value={minimumStock}
            onChange={(event) => setMinimumStock(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Partia zakupu">
          <input
            type="number"
            min="0"
            value={reorderQuantity}
            onChange={(event) => setReorderQuantity(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Lead time [dni]">
          <input
            type="number"
            min="0"
            value={leadTimeDays}
            onChange={(event) => setLeadTimeDays(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Koszt jednostkowy">
          <input
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Lokalizacja">
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="np. A-01-02"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Dostawca">
          <input
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Powiazany dzial">
          <select
            value={linkedDepartmentId}
            onChange={(event) => setLinkedDepartmentId(event.target.value)}
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
        <Field label="Typ serwisu">
          <select
            value={serviceType}
            onChange={(event) =>
              setServiceType(event.target.value as InventoryServiceType | "")
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Nieokreslony</option>
            {serviceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Powiazana kategoria maszyn">
          <select
            value={linkedMachineCategoryId}
            onChange={(event) => setLinkedMachineCategoryId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Brak</option>
            {machineCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Powiazana maszyna">
        <select
          value={linkedAssetId}
          onChange={(event) => setLinkedAssetId(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Brak</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.code})
            </option>
          ))}
        </select>
      </Field>

      {selectedCategory && selectedCategory.parameterTemplates.length > 0 ? (
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="mb-3 text-sm font-medium text-slate-900">
            Parametry kategorii
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {selectedCategory.parameterTemplates.map((template) => (
              <Field
                key={template.id}
                label={
                  template.unit
                    ? `${template.name} [${template.unit}]`
                    : template.name
                }
              >
                {template.type === "select" ? (
                  <select
                    value={parameterValues[template.code] ?? ""}
                    onChange={(event) =>
                      setParameterValues((current) => ({
                        ...current,
                        [template.code]: event.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Wybierz</option>
                    {template.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : template.type === "boolean" ? (
                  <select
                    value={parameterValues[template.code] ?? ""}
                    onChange={(event) =>
                      setParameterValues((current) => ({
                        ...current,
                        [template.code]: event.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Nie ustawiono</option>
                    <option value="true">Tak</option>
                    <option value="false">Nie</option>
                  </select>
                ) : (
                  <input
                    type={template.type === "number" ? "number" : "text"}
                    value={parameterValues[template.code] ?? ""}
                    onChange={(event) =>
                      setParameterValues((current) => ({
                        ...current,
                        [template.code]: event.target.value,
                      }))
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                )}
              </Field>
            ))}
          </div>
        </div>
      ) : null}

      <Field label="Uwagi">
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Na co uwazac przy wydaniu lub przechowywaniu?"
        />
      </Field>

      <ModalActions
        onClose={onClose}
        onSubmit={handleSubmit}
        submitLabel="Dodaj pozycje"
      />
    </ModalShell>
  );
}
