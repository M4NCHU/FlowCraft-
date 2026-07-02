import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { appShellRoutes, type AppShellRoute } from "../appShellRoutes";
import { AppSidebar } from "./components/AppSidebar";
import { useTheme } from "../providers/ThemeProvider";

type AppNavRoute = AppShellRoute & {
  nav: NonNullable<AppShellRoute["nav"]>;
};

export const RootLayout: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isLayoutEditorRoute =
    location.pathname === "/editor" || location.pathname === "/layouts";

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const currentNavRoute = useMemo(() => {
    const navRoutes = appShellRoutes.filter(
      (route): route is AppNavRoute => route.nav != null
    );

    return navRoutes
      .sort((left, right) => right.to.length - left.to.length)
      .find((route) => {
        if (route.to === "/") {
          return location.pathname === "/";
        }

        return (
          location.pathname === route.to ||
          location.pathname.startsWith(`${route.to}/`)
        );
      });
  }, [location.pathname]);

  const currentSectionLabel = useMemo(() => {
    switch (currentNavRoute?.nav.section) {
      case "facilities":
        return "Hale i layout";
      case "resources":
        return "Zasoby";
      case "operations":
        return "Operacje";
      case "analytics":
        return "Analityka";
      case "settings":
        return "Ustawienia";
      default:
        return "Przeglad";
    }
  }, [currentNavRoute]);

  return (
    <div className="h-dvh w-dvw overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full">
        <AppSidebar
          mobileOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {!isLayoutEditorRoute ? (
            <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 backdrop-blur sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 md:hidden"
                >
                  Menu
                </button>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                    {currentSectionLabel}
                  </div>
                  <div className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                    {currentNavRoute?.nav.label ?? "FlowCraft"}
                  </div>
                  {currentNavRoute?.nav.description ? (
                    <div className="hidden truncate text-xs text-slate-500 lg:block">
                      {currentNavRoute.nav.description}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {theme === "dark" ? "Tryb jasny" : "Tryb ciemny"}
                </button>
                <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  MS
                </button>
              </div>
            </header>
          ) : null}

          <main className="flex min-h-0 flex-1 bg-slate-50">
            <div
              className={[
                isLayoutEditorRoute
                  ? "relative w-full px-0 py-0"
                  : "w-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6",
                isLayoutEditorRoute
                  ? "flex h-full min-h-0 overflow-hidden"
                  : "h-full overflow-y-auto",
              ].join(" ")}
            >
              {isLayoutEditorRoute ? (
                <div className="h-full min-h-0 w-full overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMobileSidebarOpen(true)}
                    className="absolute left-3 top-3 z-20 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs font-medium text-slate-100 shadow-lg backdrop-blur md:hidden"
                  >
                    Menu
                  </button>
                  <Outlet />
                </div>
              ) : (
                <Outlet />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
