import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProjectsList } from "../model/useProjectsList";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectToolbar } from "./ProjectToolbar";

export function ProjectsScreen() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filters = useMemo(
    () => ({
      search,
    }),
    [search]
  );

  const { projects, isLoading, error, reload } = useProjectsList(filters);

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-3 lg:px-6">
      <header className="mb-1 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-50">
            Projekty optymalizacji układu
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/halls"
              className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-800"
            >
              Hale
            </Link>
            <Link
              to="/editor"
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
            >
              Otwórz edytor
            </Link>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Każdy projekt reprezentuje konkretny układ hali lub gniazda
          produkcyjnego wraz z wariantami optymalizacyjnymi.
        </p>
      </header>

      <ProjectToolbar
        search={search}
        onSearchChange={setSearch}
        onCreateClick={() => setIsCreateOpen(true)}
      />

      {isLoading ? (
        <div className="mt-6 flex justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-200">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <div className="text-sm">Ładowanie projektów...</div>
          </div>
        </div>
      ) : null}

      {!isLoading && error ? (
        <div className="mt-4 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Nie udało się pobrać listy projektów: {error.message}
        </div>
      ) : null}

      {!isLoading && !error && projects.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-8 text-center text-sm text-slate-300">
          Brak projektów spełniających kryteria. Utwórz pierwszy projekt,
          aby rozpocząć pracę z układami hal.
        </div>
      ) : null}

      {!isLoading && !error && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-slate-900/40 transition-colors hover:border-emerald-500/60 hover:shadow-emerald-500/20"
            >
              <button
                type="button"
                onClick={() =>
                  navigate(`/editor?projectId=${encodeURIComponent(project.id)}`)
                }
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-50">
                      {project.name}
                    </span>
                    <div className="text-[11px] text-slate-400">
                      {project.description?.trim() || "Projekt bez opisu"}
                    </div>
                  </div>

                  <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                    Projekt
                  </span>
                </div>

                <div className="mt-4 text-[11px] text-slate-500">
                  <div>
                    Utworzono:{" "}
                    <span className="text-slate-300">
                      {new Date(project.createdAt).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                  <div>
                    Ostatnia aktualizacja:{" "}
                    <span className="text-slate-300">
                      {new Date(project.updatedAt).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                </div>
              </button>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/editor?projectId=${encodeURIComponent(project.id)}`)
                  }
                  className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-emerald-300 transition-colors hover:border-emerald-500/60 hover:bg-slate-800"
                >
                  Otwórz w edytorze
                </button>
                <Link
                  to="/halls"
                  className="inline-flex items-center rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
                >
                  Powiązane hale
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <CreateProjectModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={reload}
      />
    </div>
  );
}