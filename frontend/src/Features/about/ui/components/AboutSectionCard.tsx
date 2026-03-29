import type { ReactNode } from "react";

type AboutSectionCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function AboutSectionCard({
  title,
  description,
  children,
  action,
  className = "",
}: AboutSectionCardProps) {
  return (
    <div
      className={`rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm ${className}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
