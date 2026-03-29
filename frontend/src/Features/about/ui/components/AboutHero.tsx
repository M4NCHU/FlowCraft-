import type { TenantDto } from "../../types";
import { formatAboutDate } from "./aboutFormatters";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          : "inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700"
      }
    >
      {active ? "Profil aktywny" : "Profil wymaga uwagi"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-base font-semibold text-slate-900">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}

type AboutHeroProps = {
  tenant: TenantDto;
  onRefresh: () => Promise<void>;
};

export function AboutHero({ tenant, onRefresh }: AboutHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.14),_transparent_28%)]" />
      <div className="relative grid gap-8 px-6 py-7 lg:grid-cols-[1.25fr_0.75fr] lg:px-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Profil firmy
            </span>
            <StatusBadge active={tenant.isActive} />
          </div>

          <div className="space-y-3">
            <div className="text-sm uppercase tracking-[0.24em] text-slate-500">
              Informacje organizacyjne
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
                {tenant.name || "Nie nazwano jeszcze firmy"}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                To miejsce gromadzi najważniejsze informacje o organizacji i
                pozwala szybko utrzymać porządek w danych firmy widocznych w
                systemie.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void onRefresh()}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Odśwież informacje
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <MetricCard
            label="Kod firmy"
            value={tenant.code?.trim() || "Nie ustawiono"}
            helper="Krótki identyfikator firmy widoczny dla zespołu."
          />
          <MetricCard
            label="Data utworzenia"
            value={formatAboutDate(tenant.createdAtUtc)}
            helper="Moment założenia profilu organizacji."
          />
          <MetricCard
            label="Ostatnia zmiana"
            value={formatAboutDate(tenant.updatedAtUtc)}
            helper="Informacja, kiedy ostatnio zaktualizowano dane firmy."
          />
        </div>
      </div>
    </div>
  );
}
