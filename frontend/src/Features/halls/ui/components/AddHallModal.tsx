// src/Features/halls/ui/components/AddHallModal.tsx
import { useMemo, useState } from "react";
import { ApiError } from "../../../../shared/api/httpClient";
import type { CreateHallRequest, HallDetailsResponse } from "../../api/contracts";
import { createHall } from "../../api/hallsApi";

type Props = {
  open: boolean;
  loadingParent?: boolean;
  onClose: () => void;
  onCreated: (hall: HallDetailsResponse) => void;
};

export function AddHallModal({
  open,
  loadingParent,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [areaSqMeters, setAreaSqMeters] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const disabled = submitting || !!loadingParent;

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && code.trim().length > 0 && !disabled;
  }, [name, code, disabled]);

  if (!open) return null;

  const submit = async () => {
    setErr(null);
    setSubmitting(true);
    try {
      const payload: CreateHallRequest = {
        name: name.trim(),
        code: code.trim(),
        description: null,
        outlineJson: "[]",
        areaSqMeters: Number.isFinite(areaSqMeters) ? areaSqMeters : 0,
      };

      const created = await createHall(payload);

      onCreated(created);
    } catch (e) {
      if (e instanceof ApiError) setErr(e.message);
      else if (e instanceof Error) setErr(e.message);
      else setErr("Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Nowa hala</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Po utworzeniu przejdziesz do edytora layoutu.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
            disabled={disabled}
          >
            Zamknij
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Nazwa</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={disabled}
                autoFocus
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-600">Kod</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={disabled}
              />
            </label>

            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs text-slate-600">Powierzchnia [m²]</span>
              <input
                type="number"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={areaSqMeters}
                onChange={(e) => setAreaSqMeters(Number(e.target.value))}
                disabled={disabled}
                min={0}
                step={0.01}
              />
            </label>
          </div>

          {err && (
            <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            disabled={disabled}
          >
            Anuluj
          </button>
          <button
            onClick={submit}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            disabled={!canSubmit}
          >
            Utwórz i przejdź do edytora
          </button>
        </div>
      </div>
    </div>
  );
}
