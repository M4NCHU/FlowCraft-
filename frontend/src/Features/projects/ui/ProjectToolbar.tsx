import React from "react";
interface ProjectToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onCreateClick: () => void;
}

export const ProjectToolbar: React.FC<ProjectToolbarProps> = ({
  search,
  onSearchChange,
  onCreateClick,
}) => {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Szukaj po nazwie lub opisie projektu..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onCreateClick}
        className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 transition-colors"
      >
        Nowy projekt
      </button>
    </div>
  );
};
