import { useMemo } from "react";
import type { TenantDto } from "../../types";

function OverviewCard({
  title,
  value,
  description,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${accent}`}
      >
        {title}
      </div>
      <div className="mt-4 text-lg font-semibold text-slate-900">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

type AboutOverviewProps = {
  tenant: TenantDto;
};

export function AboutOverview({ tenant }: AboutOverviewProps) {
  const items = useMemo(
    () => [
      {
        title: "Status profilu",
        value: tenant.isActive ? "Aktywny" : "Wymaga sprawdzenia",
        accent: tenant.isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700",
        description: tenant.isActive
          ? "Dane firmy są aktywne i gotowe do dalszej pracy."
          : "Warto sprawdzić konfigurację i uzupełnić brakujące dane.",
      },
      {
        title: "Widoczność danych",
        value: "Dane firmowe",
        accent: "border-sky-200 bg-sky-50 text-sky-700",
        description:
          "Te informacje porządkują identyfikację organizacji w aplikacji.",
      },
      {
        title: "Gotowość profilu",
        value: tenant.code?.trim() ? "Pełny profil" : "Profil podstawowy",
        accent: "border-violet-200 bg-violet-50 text-violet-700",
        description: tenant.code?.trim()
          ? "Firma ma uzupełnioną nazwę i kod organizacyjny."
          : "Warto dodać kod firmy, by ułatwić oznaczanie danych.",
      },
    ],
    [tenant]
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <OverviewCard key={item.title} {...item} />
      ))}
    </div>
  );
}
