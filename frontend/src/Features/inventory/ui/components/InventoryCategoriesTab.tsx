import { inventoryDomainLabel } from "../../model/useInventoryWorkspace";
import type { InventoryCategory } from "../../model/useInventoryWorkspace";

interface CategoriesTabProps {
  categories: InventoryCategory[];
  itemsCountByCategoryId: Record<string, number>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

export function InventoryCategoriesTab({
  categories,
  itemsCountByCategoryId,
}: CategoriesTabProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Kategorie</h2>
          <p className="mt-1 text-xs text-slate-500">
            Szablony parametrow i standardy dla grup materialowych.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {categories.length} kategorii
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => {
          const categoryItemsCount = itemsCountByCategoryId[category.id] ?? 0;

          return (
            <div
              key={category.id}
              className="rounded-lg border border-slate-200 px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">
                    {category.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {category.code} - {inventoryDomainLabel(category.domain)}
                  </div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                  {categoryItemsCount} pozycji
                </span>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                {category.description?.trim() || "Brak opisu kategorii."}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {category.parameterTemplates.map((parameter) => (
                  <span
                    key={parameter.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                  >
                    {parameter.name}
                    {parameter.unit ? ` [${parameter.unit}]` : ""}
                  </span>
                ))}
                {category.parameterTemplates.length === 0 ? (
                  <span className="text-xs text-slate-500">
                    Bez dodatkowych parametrow.
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}

        {categories.length === 0 ? (
          <EmptyState text="Brak kategorii magazynowych." />
        ) : null}
      </div>
    </div>
  );
}
