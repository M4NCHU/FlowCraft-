import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjectsList } from "../model/useProjectsList";
import { CreateProjectModal } from "./CreateProjectModal";
import { ProjectTile } from "./ProjectTile";
import { ProjectToolbar } from "./ProjectToolbar";

export function ProjectsView() {
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

  const handleOpenProject = (id: string) => {
    navigate(`/projects/${id}`);
  };

  const handleOpenInEditor = (id: string) => {
    navigate(`/editor?projectId=${encodeURIComponent(id)}`);
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-6 pt-3 lg:px-6">
      <header className="mb-1 flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-50">
          Projekty optymalizacji ukladu
        </h1>
        <p className="text-xs text-slate-400">
          Kazdy projekt reprezentuje konkretny uklad hali lub gniazda
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
          Brak projektów spelniajacych kryteria. Utwórz pierwszy projekt, aby
          rozpoczac prace z ukladami hal.
        </div>
      ) : null}

      {!isLoading && !error && projects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectTile
              key={project.id}
              project={project}
              onOpen={handleOpenProject}
              onOpenLayout={handleOpenInEditor}
            />
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
