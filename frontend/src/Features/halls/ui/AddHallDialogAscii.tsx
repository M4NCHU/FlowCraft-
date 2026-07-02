import { useMemo, useState } from "react";
import { ApiError } from "../../../shared/api/httpClient";
import type { CreateHallRequest, HallDetailsResponse } from "../api/contracts";
import { createHall } from "../api/hallsApi";

type Props = {
  open: boolean;
  loadingParent?: boolean;
  onClose: () => void;
  onCreated: (hall: HallDetailsResponse) => void;
};

export function AddHallDialogAscii({
  open,
  loadingParent,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = submitting || !!loadingParent;

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && code.trim().length > 0 && !disabled;
  }, [code, disabled, name]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const payload: CreateHallRequest = {
        name: name.trim(),
        code: code.trim(),
        description: null,
        outlineJson: "[]",
      };

      const created = await createHall(payload);
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Wystąpił błąd.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Nowa hala</h3>
            <p className="mt-1 text-sm text-slate-500">
              Po zapisaniu od razu otworzy sie edytor layoutu dla nowej hali.
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

        <div className="px-5 py-4">
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Uzupelnij podstawowe dane hali. Obrys narysujesz w edytorze, a powierzchnia policzy sie automatycznie z wymiarow layoutu.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Nazwa hali
              </span>
              <input
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={disabled}
                autoFocus
              />
              <span className="text-[11px] text-slate-500">
                Nazwa widoczna na liscie hal i w edytorze.
              </span>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Kod hali
              </span>
              <input
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={disabled}
              />
              <span className="text-[11px] text-slate-500">
                Skrot uzywany w kartach, raportach i na planie.
              </span>
            </label>

            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Powierzchnia hali
              </span>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                Wyliczana automatycznie po narysowaniu obrysu hali w edytorze.
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            disabled={disabled}
          >
            Anuluj
          </button>
          <button
            onClick={() => void handleSubmit()}
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
