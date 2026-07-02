import { useEffect, useState } from "react";
import type {
  CreateInventoryCategoryInput,
  InventoryDomain,
  InventoryParameterType,
} from "../../model/useInventoryWorkspace";
import { inventoryDomainOptions } from "../../model/useInventoryWorkspace";

type DraftParameter = {
  id: string;
  name: string;
  code: string;
  type: InventoryParameterType;
  unit: string;
  required: boolean;
  optionsText: string;
};

const parameterTypeOptions: Array<{
  value: InventoryParameterType;
  label: string;
}> = [
  { value: "text", label: "Tekst" },
  { value: "number", label: "Liczba" },
  { value: "boolean", label: "Tak / nie" },
  { value: "select", label: "Lista" },
];

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
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
  children: React.ReactNode;
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

interface InventoryCategoryModalProps {
  open: boolean;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (input: CreateInventoryCategoryInput) => void;
}

export function InventoryCategoryModal({
  open,
  departments,
  onClose,
  onSubmit,
}: InventoryCategoryModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [domain, setDomain] = useState<InventoryDomain>("spare-parts");
  const [description, setDescription] = useState("");
  const [defaultSupplier, setDefaultSupplier] = useState("");
  const [linkedDepartmentId, setLinkedDepartmentId] = useState("");
  const [parameters, setParameters] = useState<DraftParameter[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setCode("");
    setDomain("spare-parts");
    setDescription("");
    setDefaultSupplier("");
    setLinkedDepartmentId("");
    setParameters([]);
    setError("");
  }, [open]);

  if (!open) return null;

  const addParameter = () => {
    setParameters((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        code: "",
        type: "text",
        unit: "",
        required: false,
        optionsText: "",
      },
    ]);
  };

  const updateParameter = (
    parameterId: string,
    patch: Partial<DraftParameter>,
  ) => {
    setParameters((current) =>
      current.map((parameter) =>
        parameter.id === parameterId ? { ...parameter, ...patch } : parameter,
      ),
    );
  };

  const removeParameter = (parameterId: string) => {
    setParameters((current) =>
      current.filter((parameter) => parameter.id !== parameterId),
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Nazwa kategorii jest wymagana.");
      return;
    }
    if (!code.trim()) {
      setError("Kod kategorii jest wymagany.");
      return;
    }

    onSubmit({
      name,
      code,
      domain,
      description,
      defaultSupplier,
      linkedDepartmentId: linkedDepartmentId || null,
      parameterTemplates: parameters.map((parameter) => ({
        name: parameter.name.trim(),
        code: parameter.code.trim().toUpperCase(),
        type: parameter.type,
        unit: parameter.unit.trim() || null,
        required: parameter.required,
        options:
          parameter.type === "select"
            ? parameter.optionsText
                .split(",")
                .map((option) => option.trim())
                .filter(Boolean)
            : [],
      })),
    });
  };

  return (
    <ModalShell title="Dodaj kategorie magazynowa" onClose={onClose}>
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nazwa">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="np. Czesci pneumatyczne"
          />
        </Field>
        <Field label="Kod">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
            placeholder="np. INV-PNE"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Obszar">
          <select
            value={domain}
            onChange={(event) =>
              setDomain(event.target.value as InventoryDomain)
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {inventoryDomainOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Dzial domyslny">
          <select
            value={linkedDepartmentId}
            onChange={(event) => setLinkedDepartmentId(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Bez domyslnego dzialu</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Domyslny dostawca">
        <input
          value={defaultSupplier}
          onChange={(event) => setDefaultSupplier(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="np. Fabryka Supply"
        />
      </Field>

      <Field label="Opis">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Do czego uzywana jest ta grupa materialow?"
        />
      </Field>

      <div className="rounded-lg border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-medium text-slate-900">
              Szablon parametrow
            </div>
            <div className="text-xs text-slate-500">
              Definiuje pola wymagane na poziomie pozycji magazynowej.
            </div>
          </div>
          <button
            type="button"
            onClick={addParameter}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            Dodaj parametr
          </button>
        </div>

        <div className="space-y-3 p-4">
          {parameters.map((parameter, index) => (
            <div
              key={parameter.id}
              className="rounded-lg border border-slate-200 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-900">
                  Parametr {index + 1}
                </div>
                <button
                  type="button"
                  onClick={() => removeParameter(parameter.id)}
                  className="text-xs font-medium text-rose-700 hover:underline"
                >
                  Usun
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <input
                  value={parameter.name}
                  onChange={(event) =>
                    updateParameter(parameter.id, { name: event.target.value })
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Nazwa"
                />
                <input
                  value={parameter.code}
                  onChange={(event) =>
                    updateParameter(parameter.id, { code: event.target.value })
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
                  placeholder="Kod"
                />
                <select
                  value={parameter.type}
                  onChange={(event) =>
                    updateParameter(parameter.id, {
                      type: event.target.value as InventoryParameterType,
                    })
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {parameterTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={parameter.unit}
                  onChange={(event) =>
                    updateParameter(parameter.id, { unit: event.target.value })
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Jednostka"
                />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={parameter.optionsText}
                  onChange={(event) =>
                    updateParameter(parameter.id, {
                      optionsText: event.target.value,
                    })
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Opcje po przecinku dla typu lista"
                />
                <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={parameter.required}
                    onChange={(event) =>
                      updateParameter(parameter.id, {
                        required: event.target.checked,
                      })
                    }
                  />
                  Wymagany
                </label>
              </div>
            </div>
          ))}

          {parameters.length === 0 ? (
            <EmptyState text="Brak parametrow. Dodaj np. producenta, numer katalogowy lub rozmiar." />
          ) : null}
        </div>
      </div>

      <ModalActions
        onClose={onClose}
        onSubmit={handleSubmit}
        submitLabel="Zapisz kategorie"
      />
    </ModalShell>
  );
}
