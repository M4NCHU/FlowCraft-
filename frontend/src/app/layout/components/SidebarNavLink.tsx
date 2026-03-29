import React from "react";
import { NavLink } from "react-router-dom";

type SidebarNavLinkProps = {
  to: string;
  label: string;
  end?: boolean;
};

function getLinkClassName(isActive: boolean) {
  return [
    "flex items-center rounded-md px-3 py-2 transition-colors",
    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
  ].join(" ");
}

export const SidebarNavLink: React.FC<SidebarNavLinkProps> = ({
  to,
  label,
  end = false,
}) => {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => getLinkClassName(isActive)}
    >
      {label}
    </NavLink>
  );
};
