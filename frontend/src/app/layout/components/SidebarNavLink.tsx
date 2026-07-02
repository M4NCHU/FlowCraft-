import React from "react";
import { NavLink } from "react-router-dom";

type SidebarNavLinkProps = {
  to: string;
  label: string;
  end?: boolean;
  onClick?: () => void;
};

function getLinkClassName(isActive: boolean) {
  return [
    "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    isActive
      ? "border border-slate-900 bg-slate-900 text-white shadow-sm"
      : "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100/80",
  ].join(" ");
}

export const SidebarNavLink: React.FC<SidebarNavLinkProps> = ({
  to,
  label,
  end = false,
  onClick,
}) => {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => getLinkClassName(isActive)}
    >
      {label}
    </NavLink>
  );
};
