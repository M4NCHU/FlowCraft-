import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const linkCls = (isActive: boolean) =>
  [
    "flex items-center rounded-md px-3 py-2 transition-colors",
    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
  ].join(" ");

export const RootLayout: React.FC = () => {
  return (
    <div className="h-dvh w-dvw overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full">
        <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:flex md:flex-col">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
              FC
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                FlowCraft
              </span>
              <span className="text-xs text-slate-500">
                Layout optimization
              </span>
            </div>
          </div>

          <nav className="flex-1 space-y-1 text-sm">
            <NavLink to="/" end className={({ isActive }) => linkCls(isActive)}>
              Dashboard
            </NavLink>

            <NavLink
              to="/projects"
              className={({ isActive }) => linkCls(isActive)}
            >
              Projekty
            </NavLink>

            <NavLink
              to="/layouts"
              className={({ isActive }) => linkCls(isActive)}
            >
              Layouty hali
            </NavLink>

            <NavLink
              to="/optimization"
              className={({ isActive }) => linkCls(isActive)}
            >
              Optymalizacja
            </NavLink>

            <NavLink
              to="/reports"
              className={({ isActive }) => linkCls(isActive)}
            >
              Raporty
            </NavLink>

            <div className="mt-3 border-t border-slate-200 pt-3 text-xs uppercase tracking-wide text-slate-500">
              Hala
            </div>

            <NavLink
              to="/machines"
              className={({ isActive }) => linkCls(isActive)}
            >
              Maszyny
            </NavLink>

            <NavLink
              to="/work-orders"
              className={({ isActive }) => linkCls(isActive)}
            >
              Zlecenia serwisowe
            </NavLink>

            <NavLink
              to="/incidents"
              className={({ isActive }) => linkCls(isActive)}
            >
              Awarie i usterki
            </NavLink>

            <NavLink
              to="/maintenance"
              className={({ isActive }) => linkCls(isActive)}
            >
              Przeglądy planowane
            </NavLink>

            <NavLink
              to="/employees"
              className={({ isActive }) => linkCls(isActive)}
            >
              Pracownicy
            </NavLink>

            <div className="mt-3 border-t border-slate-200 pt-3 text-xs uppercase tracking-wide text-slate-500">
              Edytor
            </div>

            <NavLink
              to="/editor"
              className={({ isActive }) => linkCls(isActive)}
            >
              Edytor layoutu
            </NavLink>
          </nav>

          <div className="mt-4 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>Środowisko</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                DEV
              </span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3 md:hidden">
              <span className="text-sm font-semibold text-slate-900">
                FlowCraft
              </span>
            </div>
            <div className="flex flex-1 items-center justify-end gap-3">
              <div className="relative hidden max-w-xs flex-1 md:block">
                <input
                  type="text"
                  placeholder="Szukaj projektu, hali, layoutu..."
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-300"
                />
              </div>
              <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                MS
              </button>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 bg-slate-50">
            <div className="h-full w-full overflow-y-auto px-4 py-4 md:px-6 md:py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
