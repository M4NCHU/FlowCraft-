import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import { assetCategoriesApi } from "../../../machines/api/assetCategoriesApi";
import {
  AssetParameterType,
  AssetType,
  type AssetCategoryDto,
  type AssetCategoryParameterRequest,
} from "../../../machines/api/contracts";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (category: AssetCategoryDto) => void;
  category?: AssetCategoryDto | null;
};

type DraftParameter = AssetCategoryParameterRequest & {
  localId: string;
};

const typeOptions = [
  { value: AssetParameterType.Text, label: "Tekst" },
  { value: AssetParameterType.Number, label: "Liczba" },
  { value: AssetParameterType.Boolean, label: "Tak / Nie" },
  { value: AssetParameterType.Select, label: "Lista wyboru" },
];

function createEmptyDraftParameter(displayOrder: number): DraftParameter {
  return {
    localId: crypto.randomUUID(),
    id: null,
    name: "",
    code: "",
    type: AssetParameterType.Text,
    unit: "",
    isRequired: false,
    displayOrder,
    defaultValue: "",
    options: [],
  };
}

function mapCategoryParameters(category?: AssetCategoryDto | null): DraftParameter[] {
  if (!category) return [];

  return category.parameters
    .slice()
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((parameter, index) => ({
      localId: parameter.id,
      id: parameter.id,
      name: parameter.name,
      code: parameter.code,
      type: parameter.type,
      unit: parameter.unit ?? "",
      isRequired: parameter.isRequired,
      displayOrder: index,
      defaultValue: parameter.defaultValue ?? "",
      options: [...parameter.options],
    }));
}

export function AddMachineCategoryModal({
  open,
  onClose,
  onSaved,
  category,
}: Props) {
  const nameId = useId();
  const codeId = useId();
  const descriptionId = useId();
  const isActiveId = useId();
  const isEditing = !!category;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [parameters, setParameters] = useState<DraftParameter[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName(category?.name ?? "");
    setCode(category?.code ?? "");
    setDescription(category?.description ?? "");
    setIsActive(category?.isActive ?? true);
    setParameters(mapCategoryParameters(category));
    setError("");
    setSaving(false);
  }, [category, open]);

  if (!open) return null;

  const addParameter = () => {
    setParameters((prev) => [
      ...prev,
      createEmptyDraftParameter(prev.length),
    ]);
  };

  const updateParameter = (
    parameterLocalId: string,
    patch: Partial<DraftParameter>
  ) => {
    setParameters((prev) =>
      prev.map((parameter) =>
        parameter.localId === parameterLocalId
          ? { ...parameter, ...patch }
          : parameter
      )
    );
  };

  const removeParameter = (parameterLocalId: string) => {
    setParameters((prev) =>
      prev
        .filter((parameter) => parameter.localId !== parameterLocalId)
        .map((parameter, index) => ({ ...parameter, displayOrder: index }))
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Nazwa kategorii jest wymagana.");
      return;
    }

    if (!code.trim()) {
      setError("Kod kategorii jest wymagany.");
      return;
    }

    const normalizedParameters = parameters.map((parameter, index) => {
      const normalizedOptions =
        parameter.type === AssetParameterType.Select
          ? parameter.options.map((option) => option.trim()).filter(Boolean)
          : [];

      return {
        id: parameter.id || null,
        name: parameter.name.trim(),
        code: parameter.code.trim().toUpperCase(),
        type: parameter.type,
        unit: parameter.unit?.trim() || null,
        isRequired: parameter.isRequired,
        displayOrder: index,
        defaultValue: parameter.defaultValue?.trim() || null,
        options: normalizedOptions,
      };
    });

    const invalidParameterIndex = normalizedParameters.findIndex(
      (parameter) => !parameter.name || !parameter.code
    );
    if (invalidParameterIndex >= 0) {
      setError(
        `Parametr ${invalidParameterIndex + 1} wymaga nazwy oraz kodu.`
      );
      return;
    }

    const invalidSelectIndex = normalizedParameters.findIndex(
      (parameter) =>
        parameter.type === AssetParameterType.Select &&
        parameter.options.length === 0
    );
    if (invalidSelectIndex >= 0) {
      setError(
        `Parametr ${invalidSelectIndex + 1} typu lista musi miec przynajmniej jedna opcje.`
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        assetType: AssetType.Machine,
        description: description.trim() || null,
        parameters: normalizedParameters,
      };

      const saved = category
        ? await assetCategoriesApi.update(category.id, {
            ...payload,
            isActive,
          })
        : await assetCategoriesApi.create(payload);

      onSaved(saved);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się zapisać kategorii maszyny.");
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
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">
            {isEditing ? "Edytuj kategorie maszyny" : "Dodaj kategorie maszyny"}
          </h2>
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
                placeholder="np. Laser 2D"
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
                className="rounded-md border border-slate-300 px-3 py-2 text-sm uppercase focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
                placeholder="np. LASER-2D"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
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
                placeholder="Jakiego typu maszyny obejmuje ta kategoria?"
              />
            </div>

            <label
              htmlFor={isActiveId}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"
            >
              <input
                id={isActiveId}
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="rounded border-slate-300"
              />
              Kategoria aktywna
            </label>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  Szablon parametrow
                </div>
                <div className="text-xs text-slate-500">
                  Zdefiniuj pola, ktore beda uzupelniane na konkretnych maszynach.
                </div>
              </div>
              <button
                type="button"
                onClick={addParameter}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Dodaj parametr
              </button>
            </div>

            <div className="space-y-3 p-4">
              {parameters.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
                  Brak parametrow. Dodaj np. moc, pole robocze, rok produkcji albo medium.
                </div>
              ) : null}

              {parameters.map((parameter, index) => (
                <div
                  key={parameter.localId}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-900">
                      Parametr {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParameter(parameter.localId)}
                      className="text-xs font-medium text-rose-700 hover:underline"
                    >
                      Usun
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <input
                      value={parameter.name}
                      onChange={(event) =>
                        updateParameter(parameter.localId, { name: event.target.value })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Nazwa"
                    />
                    <input
                      value={parameter.code}
                      onChange={(event) =>
                        updateParameter(parameter.localId, { code: event.target.value })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
                      placeholder="Kod"
                    />
                    <select
                      value={parameter.type}
                      onChange={(event) =>
                        updateParameter(parameter.localId, {
                          type: Number(event.target.value) as AssetParameterType,
                        })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={parameter.unit ?? ""}
                      onChange={(event) =>
                        updateParameter(parameter.localId, { unit: event.target.value })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Jednostka"
                    />
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <input
                      value={parameter.defaultValue ?? ""}
                      onChange={(event) =>
                        updateParameter(parameter.localId, {
                          defaultValue: event.target.value,
                        })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Wartosc domyslna"
                    />
                    <input
                      value={parameter.options.join(", ")}
                      onChange={(event) =>
                        updateParameter(parameter.localId, {
                          options: event.target.value.split(","),
                        })
                      }
                      disabled={parameter.type !== AssetParameterType.Select}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                      placeholder="Opcje, po przecinku"
                    />
                    <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={parameter.isRequired}
                        onChange={(event) =>
                          updateParameter(parameter.localId, {
                            isRequired: event.target.checked,
                          })
                        }
                        className="rounded border-slate-300"
                      />
                      Wymagany parametr
                    </label>
                  </div>
                </div>
              ))}
            </div>
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
              disabled={saving}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving
                ? "Zapisywanie..."
                : isEditing
                  ? "Zapisz zmiany"
                  : "Zapisz kategorie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
