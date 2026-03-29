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
  onCreated: (category: AssetCategoryDto) => void;
};

type DraftParameter = AssetCategoryParameterRequest & {
  id: string;
};

const typeOptions = [
  { value: AssetParameterType.Text, label: "Tekst" },
  { value: AssetParameterType.Number, label: "Liczba" },
  { value: AssetParameterType.Boolean, label: "Tak / Nie" },
  { value: AssetParameterType.Select, label: "Lista wyboru" },
];

export function AddMachineCategoryModal({ open, onClose, onCreated }: Props) {
  const nameId = useId();
  const codeId = useId();
  const descriptionId = useId();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [parameters, setParameters] = useState<DraftParameter[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName("");
    setCode("");
    setDescription("");
    setParameters([]);
    setError("");
    setSaving(false);
  }, [open]);

  if (!open) return null;

  const addParameter = () => {
    setParameters((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        code: "",
        type: AssetParameterType.Text,
        unit: "",
        isRequired: false,
        displayOrder: prev.length,
        defaultValue: "",
        options: [],
      },
    ]);
  };

  const updateParameter = (
    parameterId: string,
    patch: Partial<DraftParameter>
  ) => {
    setParameters((prev) =>
      prev.map((parameter) =>
        parameter.id === parameterId ? { ...parameter, ...patch } : parameter
      )
    );
  };

  const removeParameter = (parameterId: string) => {
    setParameters((prev) =>
      prev
        .filter((parameter) => parameter.id !== parameterId)
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

    setSaving(true);
    setError("");

    try {
      const created = await assetCategoriesApi.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        assetType: AssetType.Machine,
        description: description.trim() || null,
        parameters: parameters.map((parameter, index) => ({
          name: parameter.name.trim(),
          code: parameter.code.trim().toUpperCase(),
          type: parameter.type,
          unit: parameter.unit?.trim() || null,
          isRequired: parameter.isRequired,
          displayOrder: index,
          defaultValue: parameter.defaultValue?.trim() || null,
          options:
            parameter.type === AssetParameterType.Select
              ? parameter.options
                  .map((option) => option.trim())
                  .filter(Boolean)
              : [],
        })),
      });

      onCreated(created);
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
          <h2 className="text-base font-semibold">Dodaj kategorie maszyny</h2>
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

          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <div className="text-sm font-medium text-slate-900">
                  Szablon parametr?w
                </div>
                <div className="text-xs text-slate-500">
                  Zdefiniuj pola, kt?re beda uzupełniane na konkretnych maszynach.
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
                  Brak parametr?w. Dodaj np. moc, pole robocze, rok produkcji albo medium.
                </div>
              ) : null}

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
                        updateParameter(parameter.id, { unit: event.target.value })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Jednostka"
                    />
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <input
                      value={parameter.defaultValue ?? ""}
                      onChange={(event) =>
                        updateParameter(parameter.id, {
                          defaultValue: event.target.value,
                        })
                      }
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Wartosc domyslna"
                    />
                    <input
                      value={parameter.options.join(", ")}
                      onChange={(event) =>
                        updateParameter(parameter.id, {
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
                          updateParameter(parameter.id, {
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
              {saving ? "Zapisywanie..." : "Zapisz kategorie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
