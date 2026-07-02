import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  InventoryDomain,
  InventoryItem,
  InventoryItemInsight,
  InventoryCategory,
} from "../../model/useInventoryWorkspace";
import {
  criticalityTone,
  inventoryDomainLabel,
  inventoryDomainOptions,
  serviceTypeLabel,
  serviceTypeOptions,
  serviceTypeTone,
} from "../../model/useInventoryWorkspace";

function formatQuantity(value: number, unit: string) {
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value)} ${unit}`;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

interface ItemsTabProps {
  items: InventoryItem[];
  categories: InventoryCategory[];
  insightsByItemId: Record<string, InventoryItemInsight>;
  departments: { id: string; name: string }[];
  assetsById: Record<string, { name: string }>;
  machineCategoriesById: Record<string, { name: string }>;
  departmentsById: Record<string, { name: string }>;
  onAdjustStock: (itemId: string, delta: number) => void;
  onAdjustReservation: (itemId: string, delta: number) => void;
  onCreateProcurement: (itemId: string) => void;
}

export function InventoryItemsTab({
  items,
  categories,
  insightsByItemId,
  departments,
  assetsById,
  machineCategoriesById,
  departmentsById,
  onAdjustStock,
  onAdjustReservation,
  onCreateProcurement,
}: ItemsTabProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState<InventoryDomain | "">("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [showProcurementOnly, setShowProcurementOnly] = useState(false);

  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const insight = insightsByItemId[item.id];
      const category = categoriesById[item.categoryId];

      if (categoryFilter && item.categoryId !== categoryFilter) return false;
      if (domainFilter && category?.domain !== domainFilter) return false;
      if (
        departmentFilter &&
        (item.linkedDepartmentId ?? category?.linkedDepartmentId ?? "") !==
          departmentFilter
      )
        return false;
      if (serviceTypeFilter && item.serviceType !== serviceTypeFilter)
        return false;
      if (showLowOnly && !insight?.lowStock) return false;
      if (showProcurementOnly && insight?.activeProcurementsCount === 0)
        return false;

      if (!normalizedSearch) return true;

      const haystack = [
        item.name,
        item.sku,
        category?.name ?? "",
        item.location,
        item.supplierName ?? "",
        assetsById[item.linkedAssetId ?? ""]?.name ?? "",
        machineCategoriesById[item.linkedMachineCategoryId ?? ""]?.name ?? "",
        departmentsById[item.linkedDepartmentId ?? ""]?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [
    assetsById,
    categoriesById,
    categoryFilter,
    departmentFilter,
    departmentsById,
    domainFilter,
    insightsByItemId,
    items,
    machineCategoriesById,
    search,
    serviceTypeFilter,
    showLowOnly,
    showProcurementOnly,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Pozycje magazynowe
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Wyszukuj, koryguj stock i rezerwacje pod konkretne zadania.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            {filteredItems.length} z {items.length} pozycji
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.1fr_0.75fr_0.75fr_0.75fr_0.75fr_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Szukaj po nazwie, SKU, dostawcy lub maszynie..."
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Wszystkie kategorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={domainFilter}
            onChange={(event) =>
              setDomainFilter(event.target.value as InventoryDomain | "")
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Wszystkie domeny</option>
            {inventoryDomainOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Wszystkie dzialy</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            value={serviceTypeFilter}
            onChange={(event) => setServiceTypeFilter(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Wszystkie typy serwisu</option>
            {serviceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showLowOnly}
              onChange={(event) => setShowLowOnly(event.target.checked)}
            />
            Tylko niski stock
          </label>
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showProcurementOnly}
              onChange={(event) => setShowProcurementOnly(event.target.checked)}
            />
            Z zakupem
          </label>
        </div>

        <div className="space-y-3">
          {filteredItems.map((item) => {
            const category = categoriesById[item.categoryId];
            const insight = insightsByItemId[item.id];
            const linkedAssetName = item.linkedAssetId
              ? assetsById[item.linkedAssetId]?.name
              : null;
            const linkedMachineCategoryName = item.linkedMachineCategoryId
              ? machineCategoriesById[item.linkedMachineCategoryId]?.name
              : null;
            const linkedDepartmentName = item.linkedDepartmentId
              ? departmentsById[item.linkedDepartmentId]?.name
              : null;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-medium text-slate-900">
                        {item.name}
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700">
                        {item.sku}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${criticalityTone[item.criticality]}`}
                      >
                        {item.criticality === "high"
                          ? "Krytyczna"
                          : item.criticality === "medium"
                            ? "Wazna"
                            : "Standard"}
                      </span>
                      {item.serviceType ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${serviceTypeTone(item.serviceType)}`}
                        >
                          {serviceTypeLabel(item.serviceType)}
                        </span>
                      ) : null}
                      {insight?.lowStock ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Ponizej minimum
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{category?.name ?? "Bez kategorii"}</span>
                      <span>Lokalizacja: {item.location}</span>
                      <span>
                        Dostawca:{" "}
                        {item.supplierName || category?.defaultSupplier || "-"}
                      </span>
                      {linkedDepartmentName ? (
                        <span>Dzial: {linkedDepartmentName}</span>
                      ) : null}
                      {linkedAssetName ? (
                        <span>Maszyna: {linkedAssetName}</span>
                      ) : null}
                      {!linkedAssetName && linkedMachineCategoryName ? (
                        <span>
                          Kategoria maszyn: {linkedMachineCategoryName}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-1 text-right text-xs text-slate-500">
                    <span>
                      Dostepne:{" "}
                      {formatQuantity(
                        insight?.availableQuantity ?? 0,
                        item.unit,
                      )}
                    </span>
                    <span>
                      Na stanie:{" "}
                      {formatQuantity(item.quantityOnHand, item.unit)}
                    </span>
                    <span>
                      Zarezerwowane:{" "}
                      {formatQuantity(item.quantityReserved, item.unit)}
                    </span>
                    <span>
                      Minimum: {formatQuantity(item.minimumStock, item.unit)}
                    </span>
                  </div>
                </div>

                {Object.keys(item.parameterValues).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(item.parameterValues)
                      .filter(([, value]) => value)
                      .map(([code, value]) => (
                        <span
                          key={code}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                        >
                          {category?.parameterTemplates.find(
                            (parameter) => parameter.code === code,
                          )?.name ?? code}
                          : {value}
                        </span>
                      ))}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onAdjustStock(item.id, -1)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Wydaj -1
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustStock(item.id, 1)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Przyjmij +1
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustReservation(item.id, 1)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Rezerwuj +1
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustReservation(item.id, -1)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Zwolnij -1
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateProcurement(item.id)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Zakup
                  </button>
                  {item.linkedAssetId ? (
                    <Link
                      to={`/machines/${item.linkedAssetId}`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Maszyna
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 ? (
            <EmptyState text="Brak pozycji pasujacych do aktualnych filtrow." />
          ) : null}
        </div>
      </div>
    </div>
  );
}
