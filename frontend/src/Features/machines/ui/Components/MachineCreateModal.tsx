import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import { assetCategoriesApi } from "../../api/assetCategoriesApi";
import { assetsApi } from "../../api/assetsApi";
import {
  AssetType,
  type AssetCategoryDto,
  type AssetDetailsDto,
} from "../../api/contracts";
import {
  buildMachineParameterPayload,
  buildMachineParameterValueMap,
  findMissingRequiredMachineParameter,
} from "../../model/parameterValues";
import { MachineParameterFormFields } from "./MachineParameterFormFields";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (asset: AssetDetailsDto) => void;
};

export function MachineCreateModal({ open, onClose, onCreated }: Props) {
  const nameId = useId();
  const codeId = useId();
  const modelId = useId();
  const categoryId = useId();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [model, setModel] = useState("");
  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName("");
    setCode("");
    setModel("");
    setCategories([]);
    setSelectedCategoryId("");
    setParameterValues({});
    setError("");
    setSaving(false);

    void assetCategoriesApi
      .list({ assetType: AssetType.Machine, includeInactive: false })
      .then((data) => setCategories(data ?? []))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          return;
        }

        setError("Nie udało się pobrać kategorii maszyn.");
      });
  }, [open]);

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId
  );
  const missingRequiredParameter = findMissingRequiredMachineParameter(
    selectedCategory?.parameters ?? [],
    parameterValues
  );

  if (!open) return null;

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value);

    const category = categories.find((entry) => entry.id === value);
    if (!category) {
      setParameterValues({});
      return;
    }

    setParameterValues(buildMachineParameterValueMap(category.parameters));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Nazwa jest wymagana.");
      return;
    }

    if (!code.trim()) {
      setError("Kod jest wymagany.");
      return;
    }

    if (missingRequiredParameter) {
      setError(`Parametr "${missingRequiredParameter.name}" jest wymagany.`);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await assetsApi.create({
        name: name.trim(),
        code: code.trim(),
        type: AssetType.Machine,
        categoryId: selectedCategoryId || null,
        category: null,
        description: null,
        serialNumber: null,
        manufacturer: null,
        model: model.trim() || null,
        isMobile: false,
        notes: null,
        parameters: buildMachineParameterPayload(
          selectedCategory?.parameters ?? [],
          parameterValues
        ),
      });

      onCreated(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się zapisać maszyny.");
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
          <h2 className="text-base font-semibold">Dodaj maszynę</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={nameId} className="text-sm text-slate-600">
                Nazwa <span className="text-rose-600">*</span>
              </label>
              <input
                id={nameId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. TRUMPF 3030"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={codeId} className="text-sm text-slate-600">
                Kod <span className="text-rose-600">*</span>
              </label>
              <input
                id={codeId}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. MCH-001"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={modelId} className="text-sm text-slate-600">
                Model
              </label>
              <input
                id={modelId}
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. L3030"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor={categoryId} className="text-sm text-slate-600">
                Kategoria
              </label>
              <select
                id={categoryId}
                value={selectedCategoryId}
                onChange={(event) => handleCategoryChange(event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="">Bez kategorii</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <div className="mb-3 text-sm font-medium text-slate-900">
              Parametry maszyny
            </div>
            <MachineParameterFormFields
              parameters={selectedCategory?.parameters ?? []}
              values={parameterValues}
              onChange={(parameterId, value) =>
                setParameterValues((prev) => ({ ...prev, [parameterId]: value }))
              }
              emptyText="Wybierz kategorie, aby pojawily sie parametry do uzupełnienia."
            />
            {missingRequiredParameter ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Uzupełnij parametr wymagany: {missingRequiredParameter.name}.
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={saving || !!missingRequiredParameter}
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
