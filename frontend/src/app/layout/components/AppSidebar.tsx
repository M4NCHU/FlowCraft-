import React from "react";
import { appSidebarSections } from "../../appShellRoutes";
import { SidebarNavLink } from "./SidebarNavLink";

const sectionCls =
  "mt-4 border-t border-slate-200 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500";

type AppSidebarProps = {
  mobileOpen?: boolean;
  onClose?: () => void;
};

export const AppSidebar: React.FC<AppSidebarProps> = ({
  mobileOpen = false,
  onClose,
}) => {
  return (
    <>
      <div
        className={[
          "fixed inset-0 z-30 bg-slate-950/55 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
      />

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-2xl shadow-slate-950/15 backdrop-blur transition-transform md:static md:z-auto md:w-72 md:flex-shrink-0 md:translate-x-0 md:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-white">
              FC
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">FlowCraft</span>
              <span className="text-xs text-slate-500">
                Operacje, layout i utrzymanie ruchu
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 md:hidden"
          >
            Zamknij
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {appSidebarSections.map((section) => (
            <div key={section.key}>
              {section.label ? <div className={sectionCls}>{section.label}</div> : null}
              <div className="mt-2 space-y-1">
                {section.items.map((item) => (
                  <SidebarNavLink
                    key={item.key}
                    to={item.to}
                    label={item.label}
                    end={item.end}
                    onClick={onClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};
