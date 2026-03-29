import { useState } from "react";
import { ApiError } from "../../../shared/api/httpClient";
import type { CreateProjectRequest } from "../api/contracts";
import { useCreateProject } from "../model/useCreateProject";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
};

export function CreateProjectModal({ open, onClose, onCreated }: Props) {
  const [createForm, setCreateForm] = useState<Partial<CreateProjectRequest>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const { createProject, isCreating } = useCreateProject();

  if (!open) return null;

  const handleCreateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const name = createForm.name?.trim() ?? "";

    if (!name) {
      setCreateError("Uzupełnij nazwę projektu.");
      return;
    }

    try {
      await createProject({
        name,
        description: createForm.description?.trim() || undefined,
      });
      setCreateForm({});
      await onCreated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        setCreateError(err.message);
      } else {
        setCreateError("Nie udało się utworzyć projektu.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">Nowy projekt</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            Zamknij
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleCreateSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300" htmlFor="projName">
              Nazwa projektu
            </label>
            <input
              id="projName"
              type="text"
              value={createForm.name ?? ""}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Optymalizacja hali montażu"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-300" htmlFor="projDescription">
              Opis / cel projektu
            </label>
            <textarea
              id="projDescription"
              value={createForm.description ?? ""}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Skrócenie ścieżek transportu, redukcja WIP, poprawa bezpieczeństwa..."
            />
          </div>

          {createError ? (
            <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {createError}
            </div>
          ) : null}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Tworzenie..." : "Utwórz projekt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}