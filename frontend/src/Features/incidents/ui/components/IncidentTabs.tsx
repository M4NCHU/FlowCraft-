import { useState, type ReactNode } from "react";

type Tab = { key: string; label: string; content: ReactNode };

export function IncidentTabs({
  tabs,
  initial = "details",
}: {
  tabs: Tab[];
  initial?: string;
}) {
  const [active, setActive] = useState(initial);
  return (
    <div className="w-full">
      <div className="mb-3 flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={[
              "px-3 py-2 text-sm",
              active === t.key
                ? "border-b-2 border-slate-900 font-medium text-slate-900"
                : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs.find((t) => t.key === active)?.content}</div>
    </div>
  );
}
