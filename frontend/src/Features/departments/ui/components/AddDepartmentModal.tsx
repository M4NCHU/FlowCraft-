import { useEffect, useId, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import { departmentsApi } from "../../api/departmentsApi";
import type { DepartmentDto } from "../../api/contracts";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (department: DepartmentDto) => void;
};

export function AddDepartmentModal({ open, onClose, onCreated }: Props) {
  const nameId = useId();
  const codeId = useId();
  const valueStreamId = useId();
  const descriptionId = useId();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [valueStream, setValueStream] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName("");
    setCode("");
    setValueStream("");
    setDescription("");
    setError("");
    setSaving(false);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Nazwa działu jest wymagana.");
      return;
    }

    if (!code.trim()) {
      setError("Kod działu jest wymagany.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const created = await departmentsApi.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        valueStream: valueStream.trim() || null,
        description: description.trim() || null,
      });

      onCreated(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się zapisać działu.");
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
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl">
        <div className="border-b px-5 py-3">
          <h2 className="text-base font-semibold">Dodaj dział</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
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
                placeholder="np. Utrzymanie ruchu"
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
                placeholder="np. UR"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={valueStreamId} className="text-sm text-slate-600">
              Strumien wartosci
            </label>
            <input
              id={valueStreamId}
              value={valueStream}
              onChange={(event) => setValueStream(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              placeholder="np. Montaz koncowy"
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
              rows={4}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
              placeholder="Za co odpowiada dział i jaki obszar procesu wspiera?"
            />
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
