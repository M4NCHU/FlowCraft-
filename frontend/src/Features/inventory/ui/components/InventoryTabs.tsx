import { useState, type ReactNode } from "react";

type Tab = { key: string; label: string; content: ReactNode };

export function InventoryTabs({
  tabs,
  initial = "overview",
}: {
  tabs: Tab[];
  initial?: string;
}) {
  const [active, setActive] = useState(initial);
  return (
    <div className="w-full">
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={[
              "relative px-4 py-2.5 text-sm transition-colors",
              active === t.key
                ? "font-semibold text-slate-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-slate-900"
                : "text-slate-500 hover:text-slate-800",
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
