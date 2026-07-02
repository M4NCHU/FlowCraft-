import React from "react";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { useTenant } from "../model/useTenant";
import { AboutHero } from "./components/AboutHero";
import { AboutOverview } from "./components/AboutOverview";
import { AboutIdentitySection } from "./components/AboutIdentitySection";
import { AboutSettingsCard } from "./components/AboutSettingsCard";
import {
  AboutErrorState,
  AboutLoadingState,
} from "./components/AboutStates";

export const AboutPage: React.FC = () => {
  const { status, data, error, refresh } = useTenant();

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title="O firmie"
        eyebrow="Ustawienia organizacji"
        description="Dane firmy, tozsamosc organizacyjna i ustawienia wykorzystywane dalej w raportach oraz modulach operacyjnych."
        extra={
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={status === "loading"}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Odświeżanie..." : "Odśwież dane"}
          </button>
        }
      />

      {status === "loading" && <AboutLoadingState />}

      {status === "error" && (
        <AboutErrorState
          error={error ?? "Nie udało się pobrać danych organizacji."}
          onRetry={refresh}
        />
      )}

      {status === "success" && data && (
        <div className="flex flex-col gap-6">
          <AboutHero tenant={data} onRefresh={refresh} />

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="grid gap-6">
              <AboutOverview tenant={data} />
              <AboutIdentitySection tenant={data} />
            </div>
            <AboutSettingsCard tenant={data} onSaved={refresh} />
          </div>
        </div>
      )}
    </section>
  );
};
