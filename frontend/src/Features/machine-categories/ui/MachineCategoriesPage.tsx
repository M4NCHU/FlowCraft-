import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { assetCategoriesApi } from "../../machines/api/assetCategoriesApi";
import { AssetType, type AssetCategoryDto } from "../../machines/api/contracts";
import { AddMachineCategoryModal } from "./components/AddMachineCategoryModal";

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

function sortCategories(items: AssetCategoryDto[]) {
  return [...items].sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return left.name.localeCompare(right.name, "pl");
  });
}

export function MachineCategoriesPage() {
  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<AssetCategoryDto | null>(null);

  const loadCategories = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const data = await assetCategoriesApi.list({
        assetType: AssetType.Machine,
        includeInactive: true,
        signal,
      });

      setCategories(data ?? []);
    } catch (err) {
      if (signal?.aborted) return;

      setError(toApiError(err, "Nie udało się pobrać kategorii maszyn."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadCategories(controller.signal);

    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => {
    const activeCategories = categories.filter((category) => category.isActive);
    const inactiveCategories = categories.length - activeCategories.length;

    const parameterTemplates = categories.reduce(
      (sum, category) => sum + category.parameters.length,
      0,
    );

    const categoriesWithParameters = categories.filter(
      (category) => category.parameters.length > 0,
    );

    const categoriesWithMachines = categories.filter(
      (category) => category.assetsCount > 0,
    );

    return {
      activeCategories: activeCategories.length,
      inactiveCategories,
      machineCount: categories.reduce(
        (sum, category) => sum + category.assetsCount,
        0,
      ),
      parameterTemplates,
      categoriesWithParameters: categoriesWithParameters.length,
      categoriesWithMachines: categoriesWithMachines.length,
    };
  }, [categories]);

  const sortedCategories = useMemo(
    () => sortCategories(categories),
    [categories],
  );

  const handleSaved = (category: AssetCategoryDto) => {
    setCategories((prev) =>
      sortCategories([
        category,
        ...prev.filter((item) => item.id !== category.id),
      ]),
    );
  };

  return (
    <>
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Zasoby
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {metrics.activeCategories} aktywnych
                  </span>

                  {metrics.inactiveCategories > 0 ? (
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      {metrics.inactiveCategories} nieaktywnych
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Kategorie maszyn
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Kategorie porządkują park maszynowy, definiują parametry
                  zasobów i wspierają przypisywanie kompetencji do konkretnych
                  typów maszyn.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link to="/machines" className={headerButtonClassName}>
                  Maszyny
                </Link>

                <button
                  type="button"
                  onClick={() => void loadCategories()}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Odśwież
                </button>

                <button
                  type="button"
                  onClick={() => setOpenAdd(true)}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Dodaj kategorię
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                label="Aktywne kategorie"
                value={String(metrics.activeCategories)}
                hint={`Wszystkie: ${categories.length}`}
                tone={metrics.activeCategories > 0 ? "emerald" : "slate"}
              />

              <MetricCard
                label="Maszyny przypisane"
                value={String(metrics.machineCount)}
                hint="Zasoby spięte z kategoriami"
                tone="cyan"
              />

              <MetricCard
                label="Szablony parametrów"
                value={String(metrics.parameterTemplates)}
                hint="Pola do uzupełnienia na maszynach"
                tone={metrics.parameterTemplates > 0 ? "violet" : "slate"}
              />

              <MetricCard
                label="Z parametrami"
                value={String(metrics.categoriesWithParameters)}
                hint="Kategorie z definicją danych"
                tone={metrics.categoriesWithParameters > 0 ? "amber" : "slate"}
              />

              <MetricCard
                label="Z maszynami"
                value={String(metrics.categoriesWithMachines)}
                hint="Kategorie realnie używane"
                tone={metrics.categoriesWithMachines > 0 ? "emerald" : "slate"}
              />
            </div>
          </section>

          {error ? <AlertBox tone="rose">{error.message}</AlertBox> : null}

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Lista kategorii
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Aktywne kategorie są pokazane wyżej. Parametry definiują,
                    jakie dane trzeba uzupełniać na konkretnych maszynach.
                  </p>
                </div>

                <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs font-semibold text-slate-300">
                  {loading
                    ? "Ładowanie..."
                    : `${sortedCategories.length} kategorii`}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">
                  Ładowanie kategorii maszyn...
                </div>
              ) : null}

              {!loading && !error && categories.length === 0 ? (
                <EmptyState text="Brak kategorii. Dodaj np. laser, prasę, centrum CNC albo spawarkę." />
              ) : null}

              {!loading && !error && categories.length > 0 ? (
                <div className="space-y-2">
                  {sortedCategories.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      onEdit={() => setEditingCategory(category)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <AddMachineCategoryModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSaved={handleSaved}
      />

      <AddMachineCategoryModal
        open={!!editingCategory}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSaved={handleSaved}
      />
    </>
  );
}

function CategoryRow({
  category,
  onEdit,
}: {
  category: AssetCategoryDto;
  onEdit: () => void;
}) {
  const hasParameters = category.parameters.length > 0;
  const hasMachines = category.assetsCount > 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.25fr)_0.65fr_1.35fr_0.55fr_0.65fr_0.85fr]">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-semibold text-white">
            {category.name}
          </div>

          <div className="mt-1 line-clamp-2 text-xs text-slate-500">
            {category.description?.trim() || "Brak opisu"}
          </div>
        </div>

        <InfoCell label="Kod" value={category.code || "-"} />

        <div className="min-w-0">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Parametry
          </div>

          {hasParameters ? (
            <div className="flex flex-wrap gap-1.5">
              {category.parameters.slice(0, 4).map((parameter) => (
                <span
                  key={parameter.id}
                  className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-slate-300"
                >
                  {parameter.name}
                </span>
              ))}

              {category.parameters.length > 4 ? (
                <span className="rounded-full border border-violet-400/25 bg-violet-400/[0.08] px-2 py-0.5 text-[11px] font-semibold text-violet-100">
                  +{category.parameters.length - 4}
                </span>
              ) : null}
            </div>
          ) : (
            <span className="text-sm text-slate-500">Brak parametrów</span>
          )}
        </div>

        <InfoCell label="Maszyny" value={String(category.assetsCount)} />

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Status
          </div>

          <Badge tone={category.isActive ? "emerald" : "slate"}>
            {category.isActive ? "Aktywna" : "Nieaktywna"}
          </Badge>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Akcje
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-400/40 hover:bg-amber-400/[0.12]"
            >
              Edytuj
            </button>

            <Link
              to="/machines"
              className={
                hasMachines
                  ? primaryCompactButtonClassName
                  : compactButtonClassName
              }
            >
              Powiązane maszyny
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="line-clamp-2 text-sm font-medium text-slate-300">
        {value}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-65">
        {label}
      </div>

      <div className="mt-1 truncate text-lg font-bold leading-none">
        {value}
      </div>

      <div className="mt-1 truncate text-xs opacity-70">{hint}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
        tone,
      )}`}
    >
      {children}
    </span>
  );
}

function AlertBox({
  tone,
  children,
}: {
  tone: "amber" | "rose";
  children: ReactNode;
}) {
  const className =
    tone === "rose"
      ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-100"
      : "border-amber-400/25 bg-amber-400/[0.08] text-amber-100";

  return (
    <div
      className={`shrink-0 rounded-2xl border px-4 py-2 text-sm ${className}`}
    >
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-3 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    slate: "border-slate-800 bg-slate-950/60 text-slate-100",
    cyan: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
    rose: "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
    violet: "border-violet-400/25 bg-violet-400/[0.08] text-violet-100",
  };

  return classes[tone];
}

const headerButtonClassName =
  "rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const compactButtonClassName =
  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const primaryCompactButtonClassName =
  "rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]";
