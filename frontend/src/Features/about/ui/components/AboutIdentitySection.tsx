import type { TenantDto } from "../../types";
import { AboutSectionCard } from "./AboutSectionCard";
import { formatAboutDate } from "./aboutFormatters";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-[180px_1fr] sm:items-center">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

type AboutIdentitySectionProps = {
  tenant: TenantDto;
};

export function AboutIdentitySection({
  tenant,
}: AboutIdentitySectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
      <AboutSectionCard
        title="Dane firmy"
        description="Najważniejsze informacje identyfikacyjne widoczne w systemie."
      >
        <div className="grid gap-4">
          <InfoRow label="Nazwa firmy" value={tenant.name || "--"} />
          <InfoRow label="Kod firmy" value={tenant.code?.trim() || "--"} />
          <InfoRow
            label="Data utworzenia"
            value={formatAboutDate(tenant.createdAtUtc)}
          />
          <InfoRow
            label="Ostatnia modyfikacja"
            value={formatAboutDate(tenant.updatedAtUtc)}
          />
        </div>
      </AboutSectionCard>

      <AboutSectionCard
        title="Opis sekcji"
        description="Krótki kontekst biznesowy dla tego obszaru aplikacji."
      >
        <div className="space-y-4 text-sm leading-7 text-slate-600">
          <p>
            Sekcja `O firmie` pomaga utrzymać porządek w danych organizacji i
            szybko sprawdzić, czy profil jest kompletny oraz aktualny.
          </p>
          <p>
            To dobre miejsce, by zarządzać podstawowymi danymi firmy bez
            szukania ich w innych sekcjach aplikacji.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Podpowiedź
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Utrzymuj czytelną nazwę i krótki kod firmy. To ułatwia orientację
              w raportach, listach i codziennej pracy zespołu.
            </p>
          </div>
        </div>
      </AboutSectionCard>
    </div>
  );
}
