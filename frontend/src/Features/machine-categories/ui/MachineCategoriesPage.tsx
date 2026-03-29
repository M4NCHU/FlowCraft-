import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { assetCategoriesApi } from "../../machines/api/assetCategoriesApi";
import { AssetType, type AssetCategoryDto } from "../../machines/api/contracts";
import { AddMachineCategoryModal } from "./components/AddMachineCategoryModal";

export function MachineCategoriesPage() {
  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

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
      setError(
        toApiError(err, "Nie udało się pobrać kategorii maszyn.")
      );
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
    const parameterTemplates = categories.reduce(
      (sum, category) => sum + category.parameters.length,
      0
    );

    return {
      activeCategories: activeCategories.length,
      machineCount: categories.reduce(
        (sum, category) => sum + category.assetsCount,
        0
      ),
      parameterTemplates,
    };
  }, [categories]);

  const handleCreated = (category: AssetCategoryDto) => {
    setCategories((prev) =>
      [category, ...prev].sort((a, b) => a.name.localeCompare(b.name, "pl"))
    );
  };

  return (
    <>
      <PageHeader
        title="Kategorie maszyn"
        extra={
          <div className="flex items-center gap-3">
            <Link
              to="/machines"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Maszyny
            </Link>
            <button
              onClick={() => void loadCategories()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj kategorię
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Aktywne kategorie"
          value={String(metrics.activeCategories)}
          hint={`Wszystkie rekordy: ${categories.length}`}
        />
        <MetricCard
          label="Maszyny przypisane"
          value={String(metrics.machineCount)}
          hint="Liczba maszyn spiętych z kategoriami"
        />
        <MetricCard
          label="Szablony parametrów"
          value={String(metrics.parameterTemplates)}
          hint="Parametry dostępne do uzupełniania na maszynach"
        />
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Ładowanie kategorii maszyn...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error.message}
          </div>
        ) : null}

        {!loading && !error && categories.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Brak kategorii. Dodaj np. laser, prasę, centrum CNC albo spawarkę.
          </div>
        ) : null}

        {!loading && !error && categories.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Kategoria</th>
                <th className="py-2">Kod</th>
                <th className="py-2">Parametry</th>
                <th className="py-2">Maszyny</th>
                <th className="py-2">Status</th>
                <th className="py-2">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b last:border-0">
                  <td className="py-2">
                    <div className="font-medium text-slate-900">
                      {category.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {category.description?.trim() || "Brak opisu"}
                    </div>
                  </td>
                  <td className="py-2">{category.code}</td>
                  <td className="py-2">
                    {category.parameters.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {category.parameters.slice(0, 3).map((parameter) => (
                          <span
                            key={parameter.id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {parameter.name}
                          </span>
                        ))}
                        {category.parameters.length > 3 ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            +{category.parameters.length - 3}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="py-2">{category.assetsCount}</td>
                  <td className="py-2">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                        category.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-700",
                      ].join(" ")}
                    >
                      {category.isActive ? "Aktywna" : "Nieaktywna"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to="/machines"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Powiązane maszyny
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <AddMachineCategoryModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}
