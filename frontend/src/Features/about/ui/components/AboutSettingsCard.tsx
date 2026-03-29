import { useEffect, useId, useState, type ReactNode } from "react";
import type { UpdateTenantRequest } from "../../api/contracts";
import { tenantsApi } from "../../api/tenantsApi";
import type { TenantDto } from "../../types";
import { AboutSectionCard } from "./AboutSectionCard";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

type AboutSettingsCardProps = {
  tenant: TenantDto;
  onSaved: () => Promise<void>;
};

export function AboutSettingsCard({
  tenant,
  onSaved,
}: AboutSettingsCardProps) {
  const formId = useId();
  const [name, setName] = useState(tenant.name ?? "");
  const [code, setCode] = useState(tenant.code ?? "");
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setName(tenant.name ?? "");
    setCode(tenant.code ?? "");
  }, [tenant.id, tenant.name, tenant.code]);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    setLocalError(null);
    setSaving(true);

    const controller = new AbortController();
    try {
      const payload: UpdateTenantRequest = {
        name: name.trim(),
        code: code.trim().length > 0 ? code.trim() : null,
      };

      await tenantsApi.updateMe(payload, controller.signal);
      await onSaved();
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Nie udało się zapisać zmian."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AboutSectionCard
      title="Ustawienia firmy"
      description="Zmień nazwę i kod organizacji bez opuszczania strony."
      className="h-full"
      action={
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Zapisywanie..." : "Zapisz zmiany"}
        </button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-5">
          <Field label="Nazwa firmy" htmlFor={`${formId}-name`}>
            <input
              id={`${formId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. FlowCraft Manufacturing"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </Field>

          <Field label="Kod organizacji" htmlFor={`${formId}-code`}>
            <input
              id={`${formId}-code`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="np. FC-PLANT"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
            />
          </Field>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Wskazówka
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Najlepiej sprawdzają się nazwy czytelne dla zespołu i krótkie kody
            bez spacji, które łatwo wykorzystać na listach i w raportach.
          </p>
        </div>

        {localError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {localError}
          </div>
        )}
      </div>
    </AboutSectionCard>
  );
}
