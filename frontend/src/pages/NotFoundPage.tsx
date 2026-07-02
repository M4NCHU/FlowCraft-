import { Link } from "react-router-dom";
import { PageHeader } from "../shared/ui/PageHeader";

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="404"
        title="Nie znaleziono tej podstrony"
        description="Adres nie prowadzi do zadnego aktywnego modulu. Wroc do dashboardu albo przejdz do jednego z glownych obszarow aplikacji."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { to: "/", label: "Dashboard", hint: "Przeglad KPI i ryzyk" },
          { to: "/halls", label: "Hale", hint: "Lista hal i przejscie do layoutow" },
          { to: "/machines", label: "Maszyny", hint: "Park maszynowy i statusy" },
          { to: "/activity", label: "Do zrobienia dzis", hint: "Najpilniejsze dzialania operacyjne" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="text-base font-semibold text-slate-900">{item.label}</div>
            <div className="mt-2 text-sm text-slate-500">{item.hint}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
