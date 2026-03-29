import React from "react";
import type { ProjectSummary } from "../types";

interface ProjectCardProps {
  project: ProjectSummary;
  onOpen?: (id: string) => void;
  onOpenLayout?: (id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onOpen,
  onOpenLayout,
}) => {
  const handleOpen = () => {
    if (onOpen) {
      onOpen(project.id);
    }
  };

  const handleOpenLayout = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenLayout) {
      onOpenLayout(project.id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="w-full text-left rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm shadow-slate-900/40 hover:border-emerald-500/60 hover:shadow-emerald-500/20 transition-colors"
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

      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
        <div>
          <div>
            Utworzono:{" "}
            <span className="text-slate-300">
              {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            Ostatnia aktualizacja:{" "}
            <span className="text-slate-300">
              {new Date(project.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {onOpenLayout && (
          <button
            type="button"
            onClick={handleOpenLayout}
            className="inline-flex items-center rounded-md bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-emerald-300 border border-slate-700 hover:border-emerald-500/60 hover:bg-slate-800 transition-colors"
          >
            Otwórz w edytorze
          </button>
        )}
      </div>
    </button>
  );
};
