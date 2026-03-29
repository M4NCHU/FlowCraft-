import React from "react";
import { appSidebarSections } from "../../appShellRoutes";
import { SidebarNavLink } from "./SidebarNavLink";

const sectionCls =
  "mt-3 border-t border-slate-200 pt-3 text-xs uppercase tracking-wide text-slate-500";

export const AppSidebar: React.FC = () => {
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white px-4 py-6 md:flex md:flex-col">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
          FC
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">FlowCraft</span>
          <span className="text-xs text-slate-500">Layout optimization</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 text-sm">
        {appSidebarSections.map((section) => (
          <div key={section.key}>
            {section.label ? <div className={sectionCls}>{section.label}</div> : null}
            {section.items.map((item) => (
              <SidebarNavLink
                key={item.key}
                to={item.to}
                label={item.label}
                end={item.end}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};
