import React from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "./components/AppSidebar";
import { useTheme } from "../providers/ThemeProvider";

export const RootLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const themeButtonClassName =
    theme === "dark"
      ? "rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-800"
      : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50";

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full">
        <AppSidebar />

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
              <button
                type="button"
                onClick={toggleTheme}
                className={themeButtonClassName}
              >
                Przełącz na {theme === "dark" ? "jasny" : "ciemny"}
              </button>
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
