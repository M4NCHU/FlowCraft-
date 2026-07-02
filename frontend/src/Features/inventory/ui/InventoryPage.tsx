import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDashboardOverviewData } from "../../dashboard/model/useDashboardOverviewData";
import {
  inventoryDomainLabel,
  procurementStatusLabel,
  type CreateInventoryCategoryInput,
  type CreateInventoryItemInput,
  type CreateInventoryProcurementInput,
  type InventoryCategory,
  type InventoryCriticality,
  type InventoryDomain,
  type InventoryParameterType,
  type InventoryBatchResult,
  useInventoryWorkspace,
} from "../model/useInventoryWorkspace";

const criticalityRank: Record<InventoryCriticality, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const parameterTypeOptions: Array<{
  value: InventoryParameterType;
  label: string;
}> = [
  { value: "text", label: "Tekst" },
  { value: "number", label: "Liczba" },
  { value: "boolean", label: "Tak / nie" },
  { value: "select", label: "Lista" },
];

const inventoryDomainOptions: Array<{
  value: InventoryDomain;
  label: string;
}> = [
  { value: "spare-parts", label: "Części zamienne" },
  { value: "consumables", label: "Eksploatacja" },
  { value: "safety", label: "BHP / 5S" },
  { value: "mro", label: "MRO" },
];

type DraftParameter = {
  id: string;
  name: string;
  code: string;
  type: InventoryParameterType;
  unit: string;
  required: boolean;
  optionsText: string;
};

type InventoryPanelMode = "risks" | "procurements" | "categories" | "readiness";
type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";
type BulkItemPreviewRow = {
  id: string;
  lineNumber: number;
  name: string;
  sku: string;
  quantityOnHand: number;
  minimumStock: number;
  reorderQuantity: number;
  location: string;
  supplierName: string;
  warnings: string[];
};

const quickStepOptions = [1, 5, 10, 25];

function slugifyToken(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "ITEM";
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

function parseNonNegativeNumber(value: string, fallback = 0) {
  const normalized = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(normalized)) return fallback;
  return Math.max(0, normalized);
}

function parsePositiveInteger(value: string, fallback = 1) {
  const normalized = Number.parseInt(value, 10);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.max(1, normalized);
}

function suggestLocation(category: InventoryCategory | null | undefined) {
  if (!category) return "MAG-01";
  return `MAG-${slugifyToken(category.code).slice(0, 6)}`;
}

function suggestSku(
  category: InventoryCategory | null | undefined,
  name: string,
  sequence: number,
) {
  const categoryCode = slugifyToken(category?.code ?? "INV").slice(0, 8);
  const nameToken = slugifyToken(name).slice(0, 10);
  return `${categoryCode}-${nameToken || "ITEM"}-${String(sequence).padStart(2, "0")}`;
}

function parseBulkItemLines(args: {
  rawText: string;
  category: InventoryCategory | null;
  sharedUnit: string;
  sharedQuantityOnHand: number;
  sharedMinimumStock: number;
  sharedReorderQuantity: number;
  sharedLocation: string;
  sharedSupplierName: string;
}) {
  const {
    rawText,
    category,
    sharedQuantityOnHand,
    sharedMinimumStock,
    sharedReorderQuantity,
    sharedLocation,
    sharedSupplierName,
  } = args;

  return rawText
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .map(({ line, lineNumber }) => {
      const cells = line.split(/\t|;/).map((cell) => cell.trim());
      const [
        rawName = "",
        rawSku = "",
        rawOnHand = "",
        rawMinimum = "",
        rawReorder = "",
        rawLocation = "",
        rawSupplier = "",
      ] = cells;

      const name = rawName.trim();
      const sku =
        rawSku.trim() ||
        suggestSku(category, name || `POZ-${lineNumber}`, lineNumber);
      const quantityOnHand =
        rawOnHand.trim().length > 0
          ? parseNonNegativeNumber(rawOnHand, sharedQuantityOnHand)
          : sharedQuantityOnHand;
      const minimumStock =
        rawMinimum.trim().length > 0
          ? parseNonNegativeNumber(rawMinimum, sharedMinimumStock)
          : sharedMinimumStock;
      const reorderQuantity =
        rawReorder.trim().length > 0
          ? parseNonNegativeNumber(rawReorder, sharedReorderQuantity)
          : sharedReorderQuantity;
      const location = rawLocation.trim() || sharedLocation;
      const supplierName = rawSupplier.trim() || sharedSupplierName;
      const warnings: string[] = [];

      if (!rawSku.trim()) {
        warnings.push("SKU wygenerowane automatycznie");
      }

      if (!rawLocation.trim() && sharedLocation) {
        warnings.push("uzyto wspolnej lokalizacji");
      }

      if (!rawSupplier.trim() && sharedSupplierName) {
        warnings.push("uzupelniono dostawce");
      }

      return {
        id: `${lineNumber}-${sku}`,
        lineNumber,
        name,
        sku,
        quantityOnHand,
        minimumStock,
        reorderQuantity,
        location,
        supplierName,
        warnings,
      } satisfies BulkItemPreviewRow;
    });
}

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    departments,
    assets,
    machineCategories,
    workOrders,
    maintenancePlans,
    loading,
    error: dashboardError,
    reload,
  } = useDashboardOverviewData();

  const inventory = useInventoryWorkspace({
    departments,
    assets,
    machineCategories,
    workOrders,
    maintenancePlans,
    seedReady: !loading,
  });

  const assetFilterFromUrl = searchParams.get("assetId") ?? "";
  const workOrderFilterFromUrl = searchParams.get("workOrderId") ?? "";
  const lowOnlyFromUrl = searchParams.get("low") === "1";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState<InventoryDomain | "">("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showLowOnly, setShowLowOnly] = useState(lowOnlyFromUrl);
  const [showProcurementOnly, setShowProcurementOnly] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [openItemModal, setOpenItemModal] = useState(false);
  const [openBulkItemModal, setOpenBulkItemModal] = useState(false);
  const [openProcurementModal, setOpenProcurementModal] = useState(false);
  const [procurementPrefillItemId, setProcurementPrefillItemId] = useState("");
  const [panelMode, setPanelMode] = useState<InventoryPanelMode>("risks");

  useEffect(() => {
    setShowLowOnly(lowOnlyFromUrl);
  }, [lowOnlyFromUrl]);

  const departmentsById = useMemo(
    () =>
      Object.fromEntries(
        departments.map((department) => [department.id, department]),
      ),
    [departments],
  );

  const machineCategoriesById = useMemo(
    () =>
      Object.fromEntries(
        machineCategories.map((category) => [category.id, category]),
      ),
    [machineCategories],
  );

  const assetsById = useMemo(
    () => Object.fromEntries(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  const workOrdersById = useMemo(
    () =>
      Object.fromEntries(
        workOrders.map((workOrder) => [workOrder.id, workOrder]),
      ),
    [workOrders],
  );

  const maintenancePlansById = useMemo(
    () => Object.fromEntries(maintenancePlans.map((plan) => [plan.id, plan])),
    [maintenancePlans],
  );

  const categoriesById = useMemo(
    () =>
      Object.fromEntries(
        inventory.categories.map((category) => [category.id, category]),
      ),
    [inventory.categories],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return inventory.items.filter((item) => {
      const insight = inventory.insightsByItemId[item.id];
      const category = categoriesById[item.categoryId];
      const linkedAsset = item.linkedAssetId
        ? assetsById[item.linkedAssetId]
        : null;
      const linkedMachineCategory = item.linkedMachineCategoryId
        ? machineCategoriesById[item.linkedMachineCategoryId]
        : null;
      const linkedDepartment = item.linkedDepartmentId
        ? departmentsById[item.linkedDepartmentId]
        : null;

      if (categoryFilter && item.categoryId !== categoryFilter) {
        return false;
      }

      if (domainFilter && category?.domain !== domainFilter) {
        return false;
      }

      if (
        departmentFilter &&
        (item.linkedDepartmentId ?? category?.linkedDepartmentId ?? "") !==
          departmentFilter
      ) {
        return false;
      }

      if (assetFilterFromUrl && item.linkedAssetId !== assetFilterFromUrl) {
        return false;
      }

      if (workOrderFilterFromUrl) {
        const relatedWorkOrder = workOrdersById[workOrderFilterFromUrl];
        if (!relatedWorkOrder) return false;

        const linkedByAsset =
          relatedWorkOrder.assetId &&
          item.linkedAssetId &&
          relatedWorkOrder.assetId === item.linkedAssetId;

        const linkedByCategory =
          relatedWorkOrder.assetId &&
          item.linkedMachineCategoryId &&
          assetsById[relatedWorkOrder.assetId]?.categoryId ===
            item.linkedMachineCategoryId;

        if (!linkedByAsset && !linkedByCategory) {
          return false;
        }
      }

      if (showLowOnly && !insight?.lowStock) {
        return false;
      }

      if (showProcurementOnly && insight?.activeProcurementsCount === 0) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        item.name,
        item.sku,
        category?.name ?? "",
        item.location,
        item.supplierName ?? "",
        linkedAsset?.name ?? "",
        linkedMachineCategory?.name ?? "",
        linkedDepartment?.name ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [
    assetFilterFromUrl,
    assetsById,
    categoriesById,
    categoryFilter,
    departmentFilter,
    departmentsById,
    domainFilter,
    inventory.insightsByItemId,
    inventory.items,
    machineCategoriesById,
    search,
    showLowOnly,
    showProcurementOnly,
    workOrderFilterFromUrl,
    workOrdersById,
  ]);

  const openProcurements = useMemo(
    () =>
      inventory.procurements.filter(
        (procurement) => procurement.status !== "received",
      ),
    [inventory.procurements],
  );

  const replenishmentQueue = useMemo(
    () =>
      inventory.recommendations.filter(
        (recommendation) => recommendation.recommendedAction !== "monitor",
      ),
    [inventory.recommendations],
  );

  const draftableRecommendationItemIds = useMemo(
    () =>
      inventory.recommendations
        .filter(
          (recommendation) =>
            recommendation.recommendedAction === "create-procurement-draft",
        )
        .map((recommendation) => recommendation.itemId),
    [inventory.recommendations],
  );

  const recommendedQuantityByItemId = useMemo(
    () =>
      Object.fromEntries(
        inventory.recommendations.map((recommendation) => [
          recommendation.itemId,
          recommendation.suggestedQuantity,
        ]),
      ) as Record<string, number>,
    [inventory.recommendations],
  );

  const overdueProcurements = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return openProcurements.filter((procurement) => {
      if (!procurement.expectedDeliveryAtUtc) {
        return false;
      }

      const eta = new Date(procurement.expectedDeliveryAtUtc);
      eta.setHours(0, 0, 0, 0);
      return eta.getTime() < today.getTime();
    });
  }, [openProcurements]);

  const operationalItems = useMemo(
    () =>
      inventory.items
        .filter((item) => {
          const insight = inventory.insightsByItemId[item.id];

          return (
            item.isActive &&
            insight &&
            (insight.lowStock ||
              insight.linkedOpenWorkOrdersCount > 0 ||
              insight.linkedMaintenanceDemandCount > 0)
          );
        })
        .sort((left, right) => {
          const leftInsight = inventory.insightsByItemId[left.id];
          const rightInsight = inventory.insightsByItemId[right.id];

          if (!leftInsight || !rightInsight) {
            return 0;
          }

          const leftDemand =
            leftInsight.linkedOpenWorkOrdersCount +
            leftInsight.linkedMaintenanceDemandCount;
          const rightDemand =
            rightInsight.linkedOpenWorkOrdersCount +
            rightInsight.linkedMaintenanceDemandCount;

          if (leftInsight.lowStock !== rightInsight.lowStock) {
            return leftInsight.lowStock ? -1 : 1;
          }

          if (
            criticalityRank[left.criticality] !==
            criticalityRank[right.criticality]
          ) {
            return (
              criticalityRank[left.criticality] -
              criticalityRank[right.criticality]
            );
          }

          return rightDemand - leftDemand;
        }),
    [inventory.insightsByItemId, inventory.items],
  );

  const linkedAsset = assetFilterFromUrl
    ? assetsById[assetFilterFromUrl]
    : null;
  const linkedWorkOrder = workOrderFilterFromUrl
    ? workOrdersById[workOrderFilterFromUrl]
    : null;

  const handleOpenProcurement = (itemId: string) => {
    setProcurementPrefillItemId(itemId);
    setOpenProcurementModal(true);
  };

  const handleCreateRecommendedProcurement = (itemId: string) => {
    void inventory.createRecommendedProcurementDraft(itemId);
  };

  const handleCreateDraftsForVisibleShortages = () => {
    if (draftableRecommendationItemIds.length === 0) {
      return;
    }

    void inventory.createRecommendedProcurementDraftsBatch(
      draftableRecommendationItemIds,
    );
  };

  const clearContextFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("assetId");
    next.delete("workOrderId");
    next.delete("low");
    setSearchParams(next, { replace: true });
  };

  const handleLowOnlyChange = (checked: boolean) => {
    setShowLowOnly(checked);

    const next = new URLSearchParams(searchParams);
    if (checked) {
      next.set("low", "1");
    } else {
      next.delete("low");
    }

    setSearchParams(next, { replace: true });
  };

  const isInitialLoading = loading || (inventory.loading && !inventory.isReady);

  return (
    <>
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Magazyn
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {inventory.metrics.activeItemsCount} aktywnych pozycji
                  </span>

                  {inventory.metrics.lowStockCount > 0 ? (
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      {inventory.metrics.lowStockCount} poniżej minimum
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Magazyn i materiały
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Magazyn spięty z utrzymaniem ruchu, maszynami i raportami.
                  Priorytet mają braki, zaopatrzenie i pozycje powiązane z
                  bieżącą pracą.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:max-w-[48rem] xl:justify-end">
                <Link
                  to="/reports"
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Raporty
                </Link>

                <Link
                  to="/work-orders"
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Zlecenia
                </Link>

                <button
                  type="button"
                  onClick={() => void reload()}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Odśwież kontekst
                </button>

                <button
                  type="button"
                  onClick={() => void inventory.reload()}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Odśwież magazyn
                </button>

                <button
                  type="button"
                  onClick={() => setOpenCategoryModal(true)}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Dodaj kategorię
                </button>

                <button
                  type="button"
                  onClick={() => setOpenItemModal(true)}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Dodaj pozycję
                </button>
                <button
                  type="button"
                  onClick={() => setOpenBulkItemModal(true)}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Dodaj wiele pozycji
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProcurementPrefillItemId("");
                    setOpenProcurementModal(true);
                  }}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Nowe zaopatrzenie
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label="Kategorie"
                value={String(inventory.metrics.categoriesCount)}
                hint="Szablony grup"
              />

              <MetricCard
                label="Aktywne pozycje"
                value={String(inventory.metrics.activeItemsCount)}
                hint={`${inventory.metrics.itemsLinkedToOperations} powiązanych z operacjami`}
                tone="cyan"
              />

              <MetricCard
                label="Poniżej minimum"
                value={String(inventory.metrics.lowStockCount)}
                hint="Wymaga reakcji"
                tone={inventory.metrics.lowStockCount > 0 ? "amber" : "slate"}
              />

              <MetricCard
                label="Zaopatrzenie"
                value={String(inventory.metrics.openProcurementsCount)}
                hint="Otwarte zamówienia"
                tone={
                  inventory.metrics.openProcurementsCount > 0
                    ? "emerald"
                    : "slate"
                }
              />

              <MetricCard
                label="Zarezerwowane"
                value={String(inventory.metrics.reservedUnits)}
                hint="Pod zadania"
              />

              <MetricCard
                label="Wartość"
                value={formatCurrency(inventory.metrics.estimatedValue)}
                hint="Szacunkowo"
                tone="violet"
              />
            </div>
          </section>

          {dashboardError ? (
            <AlertBox tone="amber">{dashboardError.message}</AlertBox>
          ) : null}

          {inventory.error ? (
            <AlertBox tone="rose">{inventory.error.message}</AlertBox>
          ) : null}

          {isInitialLoading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
              Ładowanie danych magazynu...
            </div>
          ) : null}

          {linkedAsset || linkedWorkOrder || showLowOnly ? (
            <div className="shrink-0 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.08] px-4 py-3 text-sm text-cyan-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {linkedAsset ? (
                    <div>
                      Maszyna:{" "}
                      <span className="font-semibold">
                        {linkedAsset.name} ({linkedAsset.code})
                      </span>
                    </div>
                  ) : null}

                  {linkedWorkOrder ? (
                    <div>
                      Zlecenie:{" "}
                      <span className="font-semibold">
                        {linkedWorkOrder.number} — {linkedWorkOrder.title}
                      </span>
                    </div>
                  ) : null}

                  {showLowOnly ? (
                    <div>Widok ograniczony do niskiego stocku.</div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={clearContextFilter}
                  className="rounded-xl border border-cyan-400/30 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-400/[0.12]"
                >
                  Wyczyść kontekst
                </button>
              </div>
            </div>
          ) : null}

          <DecisionBoard
            recommendations={replenishmentQueue}
            overdueProcurements={overdueProcurements}
            itemsById={Object.fromEntries(
              inventory.items.map((item) => [item.id, item]),
            )}
            onCreateRecommendedProcurement={handleCreateRecommendedProcurement}
            onAdvanceProcurement={(procurementId) =>
              void inventory.advanceProcurementStatus(procurementId)
            }
            onShowLowOnly={() => handleLowOnlyChange(true)}
            onOpenNewProcurement={() => {
              setProcurementPrefillItemId("");
              setOpenProcurementModal(true);
            }}
            onOpenNewItem={() => setOpenItemModal(true)}
            onOpenBulkItem={() => setOpenBulkItemModal(true)}
            onOpenNewCategory={() => setOpenCategoryModal(true)}
            onCreateDraftsForVisibleShortages={
              handleCreateDraftsForVisibleShortages
            }
            draftableRecommendationCount={draftableRecommendationItemIds.length}
          />

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(390px,0.65fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                      Pozycje magazynowe
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Lista robocza do korekt stocku, rezerwacji i zakupów.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenItemModal(true)}
                    className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                  >
                    Dodaj pozycję
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenBulkItemModal(true)}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Import wielu pozycji
                  </button>
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1.3fr_0.9fr_0.75fr_0.75fr_auto_auto]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Szukaj po nazwie, SKU, dostawcy lub maszynie..."
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                  />

                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                  >
                    <option value="">Wszystkie kategorie</option>
                    {inventory.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={domainFilter}
                    onChange={(event) =>
                      setDomainFilter(
                        event.target.value as InventoryDomain | "",
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
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
                    onChange={(event) =>
                      setDepartmentFilter(event.target.value)
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                  >
                    <option value="">Wszystkie działy</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>

                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={showLowOnly}
                      onChange={(event) =>
                        handleLowOnlyChange(event.target.checked)
                      }
                    />
                    Niski stock
                  </label>

                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={showProcurementOnly}
                      onChange={(event) =>
                        setShowProcurementOnly(event.target.checked)
                      }
                    />
                    Z zakupem
                  </label>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3">
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const category = categoriesById[item.categoryId];
                    const insight = inventory.insightsByItemId[item.id];
                    const linkedAssetName = item.linkedAssetId
                      ? assetsById[item.linkedAssetId]?.name
                      : null;
                    const linkedMachineCategoryName =
                      item.linkedMachineCategoryId
                        ? machineCategoriesById[item.linkedMachineCategoryId]
                            ?.name
                        : null;
                    const linkedDepartmentName = item.linkedDepartmentId
                      ? departmentsById[item.linkedDepartmentId]?.name
                      : null;

                    return (
                      <InventoryItemCard
                        key={item.id}
                        item={item}
                        category={category}
                        insight={insight}
                        linkedAssetName={linkedAssetName}
                        linkedMachineCategoryName={linkedMachineCategoryName}
                        linkedDepartmentName={linkedDepartmentName}
                        onOpenProcurement={handleOpenProcurement}
                        onAdjustStock={inventory.adjustItemStock}
                        onAdjustReservation={inventory.adjustItemReservation}
                      />
                    );
                  })}

                  {filteredItems.length === 0 ? (
                    <EmptyState text="Brak pozycji pasujących do aktualnych filtrów." />
                  ) : null}
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                  <PanelTab
                    active={panelMode === "risks"}
                    onClick={() => setPanelMode("risks")}
                  >
                    Ryzyka
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "procurements"}
                    onClick={() => setPanelMode("procurements")}
                  >
                    Zakupy
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "categories"}
                    onClick={() => setPanelMode("categories")}
                  >
                    Kategorie
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "readiness"}
                    onClick={() => setPanelMode("readiness")}
                  >
                    Gotowość
                  </PanelTab>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {panelMode === "risks" ? (
                  <RisksPanel
                    inventory={inventory}
                    categoriesById={categoriesById}
                    onOpenProcurement={handleOpenProcurement}
                    onCreateRecommendedProcurement={
                      handleCreateRecommendedProcurement
                    }
                  />
                ) : null}

                {panelMode === "procurements" ? (
                  <ProcurementsPanel
                    procurements={openProcurements}
                    inventory={inventory}
                    workOrdersById={workOrdersById}
                    maintenancePlansById={maintenancePlansById}
                  />
                ) : null}

                {panelMode === "categories" ? (
                  <CategoriesPanel
                    inventory={inventory}
                    onOpenCategoryModal={() => setOpenCategoryModal(true)}
                  />
                ) : null}

                {panelMode === "readiness" ? (
                  <ReadinessPanel
                    operationalItems={operationalItems}
                    inventory={inventory}
                    categoriesById={categoriesById}
                    onOpenProcurement={handleOpenProcurement}
                  />
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <InventoryCategoryModal
        open={openCategoryModal}
        departments={departments}
        onClose={() => setOpenCategoryModal(false)}
        onSubmit={(input) => {
          void inventory.addCategory(input).then(() => {
            setOpenCategoryModal(false);
          });
        }}
      />

      <InventoryItemModal
        open={openItemModal}
        categories={inventory.categories}
        departments={departments}
        machineCategories={machineCategories}
        assets={assets}
        onClose={() => setOpenItemModal(false)}
        onSubmit={(input) => {
          void inventory.addItem(input).then(() => {
            setOpenItemModal(false);
          });
        }}
      />

      <BulkInventoryItemModal
        open={openBulkItemModal}
        categories={inventory.categories}
        departments={departments}
        machineCategories={machineCategories}
        assets={assets}
        onClose={() => setOpenBulkItemModal(false)}
        onSubmit={async (inputs) => {
          const result = await inventory.addItemsBatch(inputs);
          if (result.failures.length === 0 && result.successCount > 0) {
            setOpenBulkItemModal(false);
          }
          return result;
        }}
      />

      <InventoryProcurementModal
        open={openProcurementModal}
        items={inventory.items}
        categories={inventory.categories}
        departments={departments}
        workOrders={workOrders}
        maintenancePlans={maintenancePlans}
        recommendedQuantityByItemId={recommendedQuantityByItemId}
        prefillItemId={procurementPrefillItemId}
        onClose={() => setOpenProcurementModal(false)}
        onSubmit={(input) => {
          void inventory.addProcurement(input).then(() => {
            setOpenProcurementModal(false);
            setProcurementPrefillItemId("");
          });
        }}
      />
    </>
  );
}

function DecisionBoard({
  recommendations,
  overdueProcurements,
  itemsById,
  onCreateRecommendedProcurement,
  onAdvanceProcurement,
  onShowLowOnly,
  onOpenNewProcurement,
  onOpenNewItem,
  onOpenBulkItem,
  onOpenNewCategory,
  onCreateDraftsForVisibleShortages,
  draftableRecommendationCount,
}: {
  recommendations: Array<{
    itemId: string;
    itemName: string;
    sku: string;
    unit: string;
    supplierName?: string | null;
    suggestedQuantity: number;
    leadTimeDays: number;
    urgency: "high" | "medium" | "low";
    reason: string;
    recommendedAction: string;
    nextExpectedDeliveryAtUtc?: string | null;
  }>;
  overdueProcurements: Array<{
    id: string;
    itemId: string;
    quantity: number;
    status: string;
    expectedDeliveryAtUtc?: string | null;
  }>;
  itemsById: Record<string, any>;
  onCreateRecommendedProcurement: (itemId: string) => void;
  onAdvanceProcurement: (procurementId: string) => void;
  onShowLowOnly: () => void;
  onOpenNewProcurement: () => void;
  onOpenNewItem: () => void;
  onOpenBulkItem: () => void;
  onOpenNewCategory: () => void;
  onCreateDraftsForVisibleShortages: () => void;
  draftableRecommendationCount: number;
}) {
  return (
    <section className="shrink-0 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_320px]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
              Do zamowienia teraz
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Kolejka uzupelnienia wyliczona z minimum, rezerwacji i otwartych
              dostaw.
            </p>
          </div>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">
            {recommendations.length} decyzji
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {recommendations.slice(0, 4).map((recommendation) => (
            <div
              key={recommendation.itemId}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="line-clamp-1 text-sm font-semibold text-white">
                      {recommendation.itemName}
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                      {recommendation.sku}
                    </span>
                    <UrgencyBadge urgency={recommendation.urgency} />
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {recommendation.reason}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>
                    {formatQuantity(
                      recommendation.suggestedQuantity,
                      recommendation.unit,
                    )}
                  </div>
                  <div className="mt-1">
                    lead time {recommendation.leadTimeDays} d
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {recommendation.recommendedAction ===
                "create-procurement-draft" ? (
                  <button
                    type="button"
                    onClick={() =>
                      onCreateRecommendedProcurement(recommendation.itemId)
                    }
                    className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.10] px-2.5 py-1.5 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.14]"
                  >
                    Projekt zakupu
                  </button>
                ) : (
                  <span className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100">
                    Jest dostawa w toku
                  </span>
                )}
                {recommendation.supplierName ? (
                  <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300">
                    {recommendation.supplierName}
                  </span>
                ) : null}
              </div>
            </div>
          ))}

          {recommendations.length === 0 ? (
            <EmptyState text="Brak pozycji wymagajacych nowego zakupu lub przyspieszenia dostawy." />
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
              Dostawy zagrozone
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Zamowienia z ETA po terminie, ktore warto ruszyc od razu.
            </p>
          </div>
          <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-100">
            {overdueProcurements.length} opoznionych
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {overdueProcurements.slice(0, 4).map((procurement) => {
            const item = itemsById[procurement.itemId];
            return (
              <div
                key={procurement.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-semibold text-white">
                      {item?.name ?? "Pozycja magazynowa"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      ETA:{" "}
                      {procurement.expectedDeliveryAtUtc
                        ? new Date(
                            procurement.expectedDeliveryAtUtc,
                          ).toLocaleDateString("pl-PL")
                        : "brak"}
                    </div>
                  </div>
                  <ProcurementBadge status={procurement.status} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onAdvanceProcurement(procurement.id)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Zmien status
                  </button>
                  <span className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300">
                    {formatQuantity(procurement.quantity, item?.unit ?? "szt.")}
                  </span>
                </div>
              </div>
            );
          })}

          {overdueProcurements.length === 0 ? (
            <EmptyState text="Brak opoznionych dostaw. Ten blok pilnuje tylko ETA po terminie." />
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl shadow-slate-950/20">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
          Szybki start
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Najczestsze akcje magazynu bez szukania po ekranie.
        </p>

        <div className="mt-3 grid gap-2">
          <button
            type="button"
            onClick={onOpenNewProcurement}
            className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-3 text-left text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
          >
            Nowe zaopatrzenie
          </button>
          <button
            type="button"
            onClick={onShowLowOnly}
            className="rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-3 py-3 text-left text-sm font-semibold text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-400/[0.12]"
          >
            Pokaz tylko niskie stany
          </button>
          <button
            type="button"
            onClick={onOpenNewItem}
            className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-3 text-left text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
          >
            Dodaj pozycje magazynowa
          </button>
          <button
            type="button"
            onClick={onOpenBulkItem}
            className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-3 text-left text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
          >
            Dodaj wiele pozycji naraz
          </button>
          <button
            type="button"
            onClick={onCreateDraftsForVisibleShortages}
            disabled={draftableRecommendationCount === 0}
            className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-3 text-left text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-500"
          >
            {draftableRecommendationCount > 0
              ? `Utworz projekty zakupow (${draftableRecommendationCount})`
              : "Brak projektow do utworzenia"}
          </button>
          <button
            type="button"
            onClick={onOpenNewCategory}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-left text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Dodaj kategorie
          </button>
        </div>
      </div>
    </section>
  );
}

function InventoryItemCard({
  item,
  category,
  insight,
  linkedAssetName,
  linkedMachineCategoryName,
  linkedDepartmentName,
  onOpenProcurement,
  onAdjustStock,
  onAdjustReservation,
}: {
  item: any;
  category?: InventoryCategory;
  insight: any;
  linkedAssetName?: string | null;
  linkedMachineCategoryName?: string | null;
  linkedDepartmentName?: string | null;
  onOpenProcurement: (itemId: string) => void;
  onAdjustStock: (itemId: string, quantity: number) => Promise<void>;
  onAdjustReservation: (itemId: string, quantity: number) => Promise<void>;
}) {
  const [quickStep, setQuickStep] = useState("1");
  const parsedQuickStep = parseNonNegativeNumber(quickStep, 1) || 1;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="line-clamp-1 text-sm font-semibold text-white">
              {item.name}
            </div>

            <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
              {item.sku}
            </span>

            <CriticalityBadge criticality={item.criticality} />

            {insight?.lowStock ? (
              <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2 py-0.5 text-[11px] font-semibold text-amber-100">
                Poniżej minimum
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{category?.name ?? "Bez kategorii"}</span>
            <span>Lokalizacja: {item.location || "-"}</span>
            <span>
              Dostawca: {item.supplierName || category?.defaultSupplier || "-"}
            </span>
            {linkedDepartmentName ? (
              <span>Dział: {linkedDepartmentName}</span>
            ) : null}
            {linkedAssetName ? <span>Maszyna: {linkedAssetName}</span> : null}
            {!linkedAssetName && linkedMachineCategoryName ? (
              <span>Kategoria maszyn: {linkedMachineCategoryName}</span>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-[11rem] gap-1 text-right text-xs text-slate-400">
          <span>
            Dostępne:{" "}
            {formatQuantity(insight?.availableQuantity ?? 0, item.unit)}
          </span>
          <span>Stan: {formatQuantity(item.quantityOnHand, item.unit)}</span>
          <span>
            Rezerw.: {formatQuantity(item.quantityReserved, item.unit)}
          </span>
          <span>Min.: {formatQuantity(item.minimumStock, item.unit)}</span>
        </div>
      </div>

      {Object.keys(item.parameterValues).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(item.parameterValues)
            .filter(([, value]) => value)
            .slice(0, 6)
            .map(([code, value]) => (
              <span
                key={code}
                className="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-400"
              >
                {category?.parameterTemplates.find(
                  (parameter) => parameter.code === code,
                )?.name ?? code}
                : {String(value)}
              </span>
            ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1">
          {quickStepOptions.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setQuickStep(String(value))}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                String(value) === quickStep
                  ? "bg-cyan-400/[0.18] text-cyan-100"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {value}
            </button>
          ))}
          <input
            type="number"
            min="1"
            value={quickStep}
            onChange={(event) => setQuickStep(event.target.value)}
            className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none transition focus:border-cyan-400/50"
            aria-label="Krok szybkiej akcji"
          />
        </div>
        <button
          type="button"
          onClick={() => void onAdjustStock(item.id, -parsedQuickStep)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Wydaj -{parsedQuickStep}
        </button>

        <button
          type="button"
          onClick={() => void onAdjustStock(item.id, parsedQuickStep)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Przyjmij +{parsedQuickStep}
        </button>

        <button
          type="button"
          onClick={() => void onAdjustReservation(item.id, parsedQuickStep)}
          className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
        >
          Rezerwuj +{parsedQuickStep}
        </button>

        <button
          type="button"
          onClick={() => void onAdjustReservation(item.id, -parsedQuickStep)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
        >
          Zwolnij -{parsedQuickStep}
        </button>

        <button
          type="button"
          onClick={() => onOpenProcurement(item.id)}
          className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.10] px-2.5 py-1.5 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.14]"
        >
          Zakup
        </button>

        {item.linkedAssetId ? (
          <Link
            to={`/machines/${item.linkedAssetId}`}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Maszyna
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function RisksPanel({
  inventory,
  categoriesById,
  onOpenProcurement,
  onCreateRecommendedProcurement: _onCreateRecommendedProcurement,
}: {
  inventory: ReturnType<typeof useInventoryWorkspace>;
  categoriesById: Record<string, InventoryCategory>;
  onOpenProcurement: (itemId: string) => void;
  onCreateRecommendedProcurement: (itemId: string) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <PanelHeader
        title="Ryzyka i kolejka zaopatrzenia"
        description="Sugestie zakupu wynikające ze stanu magazynu i otwartych zadań."
        action={
          <button
            type="button"
            onClick={() => onOpenProcurement("")}
            className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
          >
            Dodaj zakup
          </button>
        }
      />

      <div className="mt-3 space-y-2">
        {inventory.suggestions.slice(0, 8).map((suggestion) => {
          const item = inventory.items.find(
            (entry) => entry.id === suggestion.itemId,
          );
          const insight = inventory.insightsByItemId[suggestion.itemId];

          if (!item || !insight) return null;

          return (
            <div
              key={suggestion.itemId}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-semibold text-white">
                    {item.name}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {suggestion.reason}
                  </div>
                </div>

                <UrgencyBadge urgency={suggestion.urgency} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>
                  Dostępne:{" "}
                  {formatQuantity(insight.availableQuantity, item.unit)}
                </span>
                <span>
                  Zakup:{" "}
                  {formatQuantity(suggestion.suggestedQuantity, item.unit)}
                </span>
                <span>Lead time: {item.leadTimeDays} dni</span>
                <span>
                  {categoriesById[item.categoryId]?.name ?? "Bez kategorii"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOpenProcurement(item.id)}
                  className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.10] px-2.5 py-1.5 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.14]"
                >
                  Utwórz zakup
                </button>

                {item.linkedAssetId ? (
                  <Link
                    to={`/machines/${item.linkedAssetId}`}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Maszyna
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}

        {inventory.suggestions.length === 0 ? (
          <EmptyState text="Brak pozycji wymagających pilnej reakcji zakupowej." />
        ) : null}
      </div>
    </div>
  );
}

function ProcurementsPanel({
  procurements,
  inventory,
  workOrdersById,
  maintenancePlansById,
}: {
  procurements: any[];
  inventory: ReturnType<typeof useInventoryWorkspace>;
  workOrdersById: Record<string, any>;
  maintenancePlansById: Record<string, any>;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <PanelHeader
        title="Zamówienia i dostawy"
        description="Status zaopatrzenia i przyjmowanie dostaw."
      />

      <div className="mt-3 space-y-2">
        {procurements.slice(0, 12).map((procurement) => {
          const item = inventory.items.find(
            (entry) => entry.id === procurement.itemId,
          );

          return (
            <div
              key={procurement.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="line-clamp-1 text-sm font-semibold text-white">
                  {item?.name ?? "Pozycja usunięta"}
                </div>

                <ProcurementBadge status={procurement.status} />
              </div>

              <div className="mt-2 text-xs text-slate-500">
                {formatQuantity(procurement.quantity, item?.unit ?? "szt.")} —{" "}
                {procurement.supplierName ||
                  item?.supplierName ||
                  "Brak dostawcy"}
              </div>

              {procurement.linkedWorkOrderId ? (
                <div className="mt-1 text-xs text-slate-500">
                  Zlecenie:{" "}
                  {workOrdersById[procurement.linkedWorkOrderId]?.number ??
                    procurement.linkedWorkOrderId}
                </div>
              ) : null}

              {procurement.linkedMaintenancePlanId ? (
                <div className="mt-1 text-xs text-slate-500">
                  Plan:{" "}
                  {maintenancePlansById[procurement.linkedMaintenancePlanId]
                    ?.title ?? procurement.linkedMaintenancePlanId}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void inventory.advanceProcurementStatus(procurement.id)
                  }
                  className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Zmień status
                </button>

                {item?.linkedAssetId ? (
                  <Link
                    to={`/machines/${item.linkedAssetId}`}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Maszyna
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}

        {procurements.length === 0 ? (
          <EmptyState text="Brak otwartych zamówień magazynowych." />
        ) : null}
      </div>
    </div>
  );
}

function CategoriesPanel({
  inventory,
  onOpenCategoryModal,
}: {
  inventory: ReturnType<typeof useInventoryWorkspace>;
  onOpenCategoryModal: () => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <PanelHeader
        title="Kategorie"
        description="Szablony parametrów i standardy grup materiałowych."
        action={
          <button
            type="button"
            onClick={onOpenCategoryModal}
            className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
          >
            Dodaj
          </button>
        }
      />

      <div className="mt-3 space-y-2">
        {inventory.categories.map((category) => {
          const categoryItemsCount = inventory.items.filter(
            (item) => item.categoryId === category.id,
          ).length;

          return (
            <div
              key={category.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {category.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {category.code} — {inventoryDomainLabel(category.domain)}
                  </div>
                </div>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300">
                  {categoryItemsCount} pozycji
                </span>
              </div>

              <div className="mt-2 line-clamp-2 text-xs text-slate-500">
                {category.description?.trim() || "Brak opisu kategorii."}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {category.parameterTemplates.slice(0, 8).map((parameter) => (
                  <span
                    key={parameter.id}
                    className="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-400"
                  >
                    {parameter.name}
                    {parameter.unit ? ` [${parameter.unit}]` : ""}
                  </span>
                ))}

                {category.parameterTemplates.length === 0 ? (
                  <span className="text-xs text-slate-500">
                    Bez dodatkowych parametrów.
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}

        {inventory.categories.length === 0 ? (
          <EmptyState text="Brak kategorii magazynowych." />
        ) : null}
      </div>
    </div>
  );
}

function ReadinessPanel({
  operationalItems,
  inventory,
  categoriesById,
  onOpenProcurement,
}: {
  operationalItems: any[];
  inventory: ReturnType<typeof useInventoryWorkspace>;
  categoriesById: Record<string, InventoryCategory>;
  onOpenProcurement: (itemId: string) => void;
}) {
  return (
    <div className="h-full overflow-auto p-3">
      <PanelHeader
        title="Gotowość serwisowa"
        description="Pozycje wspierające aktywne zlecenia, przeglądy i bieżące UR."
        action={
          <Link
            to="/reports"
            className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Raport ryzyk
          </Link>
        }
      />

      <div className="mt-3 space-y-2">
        {operationalItems.slice(0, 10).map((item) => {
          const insight = inventory.insightsByItemId[item.id];
          const category = categoriesById[item.categoryId];

          if (!insight) return null;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="line-clamp-1 text-sm font-semibold text-white">
                    {item.name}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[category?.name ?? "Bez kategorii", item.location].join(
                      " — ",
                    )}
                  </div>
                </div>

                <CriticalityBadge criticality={item.criticality} />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <SmallInfo
                  label="Pokrycie"
                  value={
                    insight.estimatedCoverageDays != null
                      ? `${insight.estimatedCoverageDays} dni`
                      : "Brak estymacji"
                  }
                />

                <SmallInfo
                  label="Dostępne"
                  value={formatQuantity(insight.availableQuantity, item.unit)}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>Zlecenia: {insight.linkedOpenWorkOrdersCount}</span>
                <span>Przeglądy: {insight.linkedMaintenanceDemandCount}</span>
                <span>Zakupy: {insight.activeProcurementsCount}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.linkedAssetId ? (
                  <Link
                    to={`/machines/${item.linkedAssetId}`}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Maszyna
                  </Link>
                ) : null}

                {item.linkedAssetId ? (
                  <Link
                    to={`/maintenance?assetId=${encodeURIComponent(item.linkedAssetId)}`}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Przeglądy
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={() => onOpenProcurement(item.id)}
                  className="rounded-lg border border-emerald-400/30 bg-emerald-400/[0.10] px-2.5 py-1.5 text-xs font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.14]"
                >
                  Uzupełnij
                </button>
              </div>
            </div>
          );
        })}

        {operationalItems.length === 0 ? (
          <EmptyState text="Brak pozycji magazynowych wymagających interwencji operacyjnej." />
        ) : null}
      </div>
    </div>
  );
}

function InventoryCategoryModal({
  open,
  departments,
  onClose,
  onSubmit,
}: {
  open: boolean;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (input: CreateInventoryCategoryInput) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [domain, setDomain] = useState<InventoryDomain>("spare-parts");
  const [description, setDescription] = useState("");
  const [defaultSupplier, setDefaultSupplier] = useState("");
  const [linkedDepartmentId, setLinkedDepartmentId] = useState("");
  const [parameters, setParameters] = useState<DraftParameter[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setName("");
    setCode("");
    setDomain("spare-parts");
    setDescription("");
    setDefaultSupplier("");
    setLinkedDepartmentId("");
    setParameters([]);
    setError("");
  }, [open]);

  if (!open) return null;

  const addParameter = () => {
    setParameters((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        code: "",
        type: "text",
        unit: "",
        required: false,
        optionsText: "",
      },
    ]);
  };

  const updateParameter = (
    parameterId: string,
    patch: Partial<DraftParameter>,
  ) => {
    setParameters((current) =>
      current.map((parameter) =>
        parameter.id === parameterId ? { ...parameter, ...patch } : parameter,
      ),
    );
  };

  const removeParameter = (parameterId: string) => {
    setParameters((current) =>
      current.filter((parameter) => parameter.id !== parameterId),
    );
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Nazwa kategorii jest wymagana.");
      return;
    }

    if (!code.trim()) {
      setError("Kod kategorii jest wymagany.");
      return;
    }

    onSubmit({
      name,
      code,
      domain,
      description,
      defaultSupplier,
      linkedDepartmentId: linkedDepartmentId || null,
      parameterTemplates: parameters.map((parameter) => ({
        name: parameter.name.trim(),
        code: parameter.code.trim().toUpperCase(),
        type: parameter.type,
        unit: parameter.unit.trim() || null,
        required: parameter.required,
        options:
          parameter.type === "select"
            ? parameter.optionsText
                .split(",")
                .map((option) => option.trim())
                .filter(Boolean)
            : [],
      })),
    });
  };

  return (
    <ModalShell title="Dodaj kategorię magazynową" onClose={onClose}>
      {error ? <ModalError>{error}</ModalError> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nazwa">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
            placeholder="np. Części pneumatyczne"
          />
        </Field>

        <Field label="Kod">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={`${inputClassName} uppercase`}
            placeholder="np. INV-PNE"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Obszar">
          <select
            value={domain}
            onChange={(event) =>
              setDomain(event.target.value as InventoryDomain)
            }
            className={inputClassName}
          >
            {inventoryDomainOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Dział domyślny">
          <select
            value={linkedDepartmentId}
            onChange={(event) => setLinkedDepartmentId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Bez domyślnego działu</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Domyślny dostawca">
        <input
          value={defaultSupplier}
          onChange={(event) => setDefaultSupplier(event.target.value)}
          className={inputClassName}
          placeholder="np. Fabryka Supply"
        />
      </Field>

      <Field label="Opis">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className={inputClassName}
          placeholder="Do czego używana jest ta grupa materiałów?"
        />
      </Field>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">
              Szablon parametrów
            </div>
            <div className="text-xs text-slate-500">
              Definiuje pola wymagane na poziomie pozycji magazynowej.
            </div>
          </div>

          <button
            type="button"
            onClick={addParameter}
            className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
          >
            Dodaj parametr
          </button>
        </div>

        <div className="space-y-3 p-4">
          {parameters.map((parameter, index) => (
            <div
              key={parameter.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-white">
                  Parametr {index + 1}
                </div>

                <button
                  type="button"
                  onClick={() => removeParameter(parameter.id)}
                  className="text-xs font-semibold text-rose-200 hover:underline"
                >
                  Usuń
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <input
                  value={parameter.name}
                  onChange={(event) =>
                    updateParameter(parameter.id, { name: event.target.value })
                  }
                  className={inputClassName}
                  placeholder="Nazwa"
                />

                <input
                  value={parameter.code}
                  onChange={(event) =>
                    updateParameter(parameter.id, { code: event.target.value })
                  }
                  className={`${inputClassName} uppercase`}
                  placeholder="Kod"
                />

                <select
                  value={parameter.type}
                  onChange={(event) =>
                    updateParameter(parameter.id, {
                      type: event.target.value as InventoryParameterType,
                    })
                  }
                  className={inputClassName}
                >
                  {parameterTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  value={parameter.unit}
                  onChange={(event) =>
                    updateParameter(parameter.id, { unit: event.target.value })
                  }
                  className={inputClassName}
                  placeholder="Jednostka"
                />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={parameter.optionsText}
                  onChange={(event) =>
                    updateParameter(parameter.id, {
                      optionsText: event.target.value,
                    })
                  }
                  className={inputClassName}
                  placeholder="Opcje po przecinku dla typu lista"
                />

                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={parameter.required}
                    onChange={(event) =>
                      updateParameter(parameter.id, {
                        required: event.target.checked,
                      })
                    }
                  />
                  Wymagany
                </label>
              </div>
            </div>
          ))}

          {parameters.length === 0 ? (
            <EmptyState text="Brak parametrów. Dodaj np. producenta, numer katalogowy lub rozmiar." />
          ) : null}
        </div>
      </div>

      <ModalActions
        onClose={onClose}
        onSubmit={handleSubmit}
        submitLabel="Zapisz kategorię"
      />
    </ModalShell>
  );
}

function InventoryItemModal({
  open,
  categories,
  departments,
  machineCategories,
  assets,
  onClose,
  onSubmit,
}: {
  open: boolean;
  categories: InventoryCategory[];
  departments: { id: string; name: string }[];
  machineCategories: { id: string; name: string }[];
  assets: {
    id: string;
    name: string;
    code: string;
    categoryId?: string | null;
  }[];
  onClose: () => void;
  onSubmit: (input: CreateInventoryItemInput) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("szt.");
  const [quantityOnHand, setQuantityOnHand] = useState("0");
  const [quantityReserved, setQuantityReserved] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [reorderQuantity, setReorderQuantity] = useState("1");
  const [leadTimeDays, setLeadTimeDays] = useState("3");
  const [location, setLocation] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [linkedDepartmentId, setLinkedDepartmentId] = useState("");
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [linkedMachineCategoryId, setLinkedMachineCategoryId] = useState("");
  const [criticality, setCriticality] =
    useState<InventoryCriticality>("medium");
  const [notes, setNotes] = useState("");
  const [parameterValues, setParameterValues] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const initialCategory = categories[0] ?? null;

    setCategoryId(initialCategory?.id ?? "");
    setName("");
    setSku("");
    setUnit("szt.");
    setQuantityOnHand("0");
    setQuantityReserved("0");
    setMinimumStock("0");
    setReorderQuantity("1");
    setLeadTimeDays("3");
    setLocation(suggestLocation(initialCategory));
    setSupplierName(initialCategory?.defaultSupplier ?? "");
    setUnitCost("");
    setLinkedDepartmentId(initialCategory?.linkedDepartmentId ?? "");
    setLinkedAssetId("");
    setLinkedMachineCategoryId("");
    setCriticality("medium");
    setNotes("");
    setParameterValues({});
    setError("");
  }, [categories, open]);

  const selectedCategory =
    categories.find((category) => category.id === categoryId) ?? null;

  useEffect(() => {
    if (!selectedCategory) return;

    setParameterValues((current) => {
      const next: Record<string, string> = {};

      selectedCategory.parameterTemplates.forEach((template) => {
        next[template.code] = current[template.code] ?? "";
      });

      return next;
    });

    if (!supplierName && selectedCategory.defaultSupplier) {
      setSupplierName(selectedCategory.defaultSupplier);
    }

    if (!linkedDepartmentId && selectedCategory.linkedDepartmentId) {
      setLinkedDepartmentId(selectedCategory.linkedDepartmentId);
    }

    if (!location) {
      setLocation(suggestLocation(selectedCategory));
    }
  }, [linkedDepartmentId, location, selectedCategory, supplierName]);

  useEffect(() => {
    if (!linkedAssetId) return;

    const selectedAsset = assets.find((asset) => asset.id === linkedAssetId);
    if (selectedAsset?.categoryId) {
      setLinkedMachineCategoryId(selectedAsset.categoryId);
    }
  }, [assets, linkedAssetId]);

  if (!open) return null;

  const handleSubmit = () => {
    const normalizedName = name.trim();
    const normalizedUnit = unit.trim() || "szt.";
    const normalizedLocation =
      location.trim() || suggestLocation(selectedCategory);
    const normalizedSku =
      sku.trim() || suggestSku(selectedCategory, normalizedName, 1);
    const parsedOnHand = parseNonNegativeNumber(quantityOnHand);
    const parsedReserved = parseNonNegativeNumber(quantityReserved);
    const parsedMinimum = parseNonNegativeNumber(minimumStock);
    const parsedReorder = parseNonNegativeNumber(reorderQuantity, 1);
    const parsedLeadTime = parsePositiveInteger(leadTimeDays, 3);

    if (!categoryId) {
      setError("Wybierz kategorie.");
      return;
    }

    if (!normalizedName) {
      setError("Nazwa pozycji jest wymagana.");
      return;
    }

    if (!normalizedLocation) {
      setError("Lokalizacja jest wymagana.");
      return;
    }

    if (parsedReserved > parsedOnHand) {
      setError("Rezerwacja nie moze byc wyzsza niz stan magazynowy.");
      return;
    }

    if (
      selectedCategory?.parameterTemplates.some((template) => {
        const value = parameterValues[template.code] ?? "";
        return template.required && value.trim().length === 0;
      })
    ) {
      setError("Uzupelnij wymagane parametry kategorii.");
      return;
    }

    onSubmit({
      categoryId,
      name: normalizedName,
      sku: normalizedSku,
      unit: normalizedUnit,
      quantityOnHand: parsedOnHand,
      quantityReserved: parsedReserved,
      minimumStock: parsedMinimum,
      reorderQuantity: parsedReorder,
      leadTimeDays: parsedLeadTime,
      location: normalizedLocation,
      supplierName: normalizeOptionalText(supplierName) || null,
      unitCost: unitCost ? parseNonNegativeNumber(unitCost) : null,
      linkedDepartmentId: linkedDepartmentId || null,
      linkedAssetId: linkedAssetId || null,
      linkedMachineCategoryId: linkedMachineCategoryId || null,
      parameterValues,
      criticality,
      notes: normalizeOptionalText(notes) || null,
    });
  };

  return (
    <ModalShell title="Dodaj pozycje magazynowa" onClose={onClose}>
      {error ? <ModalError>{error}</ModalError> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Kategoria">
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Wybierz kategorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Krytycznosc">
          <select
            value={criticality}
            onChange={(event) =>
              setCriticality(event.target.value as InventoryCriticality)
            }
            className={inputClassName}
          >
            <option value="low">Standard</option>
            <option value="medium">Wazna</option>
            <option value="high">Krytyczna</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Nazwa">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
            placeholder="np. Czujnik fotoelektryczny"
          />
        </Field>

        <Field label="SKU / indeks">
          <input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            className={`${inputClassName} uppercase`}
            placeholder="Zostanie wygenerowane, jesli zostawisz puste"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Jednostka">
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Na stanie">
          <input
            type="number"
            min="0"
            value={quantityOnHand}
            onChange={(event) => setQuantityOnHand(event.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Zarezerwowane">
          <input
            type="number"
            min="0"
            value={quantityReserved}
            onChange={(event) => setQuantityReserved(event.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Minimum">
          <input
            type="number"
            min="0"
            value={minimumStock}
            onChange={(event) => setMinimumStock(event.target.value)}
            className={inputClassName}
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Partia zakupu">
          <input
            type="number"
            min="0"
            value={reorderQuantity}
            onChange={(event) => setReorderQuantity(event.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Lead time [dni]">
          <input
            type="number"
            min="1"
            value={leadTimeDays}
            onChange={(event) => setLeadTimeDays(event.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Koszt jednostkowy">
          <input
            type="number"
            min="0"
            step="0.01"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Lokalizacja">
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={inputClassName}
            placeholder="np. A-01-02"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Dostawca">
          <input
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="Powiazany dzial">
          <select
            value={linkedDepartmentId}
            onChange={(event) => setLinkedDepartmentId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Brak</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Powiazana kategoria maszyn">
          <select
            value={linkedMachineCategoryId}
            onChange={(event) => setLinkedMachineCategoryId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Brak</option>
            {machineCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Powiazana maszyna">
        <select
          value={linkedAssetId}
          onChange={(event) => setLinkedAssetId(event.target.value)}
          className={inputClassName}
        >
          <option value="">Brak</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.code})
            </option>
          ))}
        </select>
      </Field>

      {selectedCategory && selectedCategory.parameterTemplates.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-3 text-sm font-semibold text-white">
            Parametry kategorii
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {selectedCategory.parameterTemplates.map((template) => (
              <Field
                key={template.id}
                label={`${template.name}${template.unit ? ` [${template.unit}]` : ""}${template.required ? " *" : ""}`}
              >
                {template.type === "select" ? (
                  <select
                    value={parameterValues[template.code] ?? ""}
                    onChange={(event) =>
                      setParameterValues((current) => ({
                        ...current,
                        [template.code]: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="">Wybierz</option>
                    {template.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : template.type === "boolean" ? (
                  <select
                    value={parameterValues[template.code] ?? ""}
                    onChange={(event) =>
                      setParameterValues((current) => ({
                        ...current,
                        [template.code]: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="">Nie ustawiono</option>
                    <option value="true">Tak</option>
                    <option value="false">Nie</option>
                  </select>
                ) : (
                  <input
                    type={template.type === "number" ? "number" : "text"}
                    value={parameterValues[template.code] ?? ""}
                    onChange={(event) =>
                      setParameterValues((current) => ({
                        ...current,
                        [template.code]: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  />
                )}
              </Field>
            ))}
          </div>
        </div>
      ) : null}

      <Field label="Uwagi">
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className={inputClassName}
          placeholder="Na co uwazac przy wydaniu lub przechowywaniu?"
        />
      </Field>

      <ModalActions
        onClose={onClose}
        onSubmit={handleSubmit}
        submitLabel="Dodaj pozycje"
      />
    </ModalShell>
  );
}

function BulkInventoryItemModal({
  open,
  categories,
  departments,
  machineCategories,
  assets,
  onClose,
  onSubmit,
}: {
  open: boolean;
  categories: InventoryCategory[];
  departments: { id: string; name: string }[];
  machineCategories: { id: string; name: string }[];
  assets: {
    id: string;
    name: string;
    code: string;
    categoryId?: string | null;
  }[];
  onClose: () => void;
  onSubmit: (
    input: CreateInventoryItemInput[],
  ) => Promise<InventoryBatchResult>;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("szt.");
  const [quantityOnHand, setQuantityOnHand] = useState("0");
  const [minimumStock, setMinimumStock] = useState("0");
  const [reorderQuantity, setReorderQuantity] = useState("1");
  const [leadTimeDays, setLeadTimeDays] = useState("3");
  const [location, setLocation] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [linkedDepartmentId, setLinkedDepartmentId] = useState("");
  const [linkedAssetId, setLinkedAssetId] = useState("");
  const [linkedMachineCategoryId, setLinkedMachineCategoryId] = useState("");
  const [criticality, setCriticality] =
    useState<InventoryCriticality>("medium");
  const [notes, setNotes] = useState("");
  const [rawLines, setRawLines] = useState("");
  const [parameterValues, setParameterValues] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const initialCategory = categories[0] ?? null;
    setCategoryId(initialCategory?.id ?? "");
    setUnit("szt.");
    setQuantityOnHand("0");
    setMinimumStock("0");
    setReorderQuantity("1");
    setLeadTimeDays("3");
    setLocation(suggestLocation(initialCategory));
    setSupplierName(initialCategory?.defaultSupplier ?? "");
    setLinkedDepartmentId(initialCategory?.linkedDepartmentId ?? "");
    setLinkedAssetId("");
    setLinkedMachineCategoryId("");
    setCriticality("medium");
    setNotes("");
    setRawLines("");
    setParameterValues({});
    setError("");
  }, [categories, open]);

  const selectedCategory =
    categories.find((category) => category.id === categoryId) ?? null;

  useEffect(() => {
    if (!selectedCategory) return;

    setParameterValues((current) => {
      const next: Record<string, string> = {};
      selectedCategory.parameterTemplates.forEach((template) => {
        next[template.code] = current[template.code] ?? "";
      });
      return next;
    });

    if (!supplierName && selectedCategory.defaultSupplier) {
      setSupplierName(selectedCategory.defaultSupplier);
    }

    if (!linkedDepartmentId && selectedCategory.linkedDepartmentId) {
      setLinkedDepartmentId(selectedCategory.linkedDepartmentId);
    }

    if (!location) {
      setLocation(suggestLocation(selectedCategory));
    }
  }, [linkedDepartmentId, location, selectedCategory, supplierName]);

  useEffect(() => {
    if (!linkedAssetId) return;

    const selectedAsset = assets.find((asset) => asset.id === linkedAssetId);
    if (selectedAsset?.categoryId) {
      setLinkedMachineCategoryId(selectedAsset.categoryId);
    }
  }, [assets, linkedAssetId]);

  const previewRows = useMemo(
    () =>
      parseBulkItemLines({
        rawText: rawLines,
        category: selectedCategory,
        sharedUnit: unit,
        sharedQuantityOnHand: parseNonNegativeNumber(quantityOnHand),
        sharedMinimumStock: parseNonNegativeNumber(minimumStock),
        sharedReorderQuantity: parseNonNegativeNumber(reorderQuantity, 1),
        sharedLocation: location.trim() || suggestLocation(selectedCategory),
        sharedSupplierName: normalizeOptionalText(supplierName),
      }),
    [
      location,
      minimumStock,
      quantityOnHand,
      rawLines,
      reorderQuantity,
      selectedCategory,
      supplierName,
      unit,
    ],
  );

  const duplicateSkuSet = useMemo(() => {
    const counts = new Map<string, number>();
    previewRows.forEach((row) => {
      counts.set(row.sku, (counts.get(row.sku) ?? 0) + 1);
    });

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([sku]) => sku),
    );
  }, [previewRows]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!categoryId) {
      setError("Wybierz kategorie dla importu.");
      return;
    }

    if (previewRows.length === 0) {
      setError("Wklej co najmniej jeden wiersz do importu.");
      return;
    }

    if (previewRows.some((row) => row.name.trim().length === 0)) {
      setError("Kazdy wiersz musi zawierac nazwe pozycji.");
      return;
    }

    if (duplicateSkuSet.size > 0) {
      setError("W imporcie wykryto zduplikowane SKU. Popraw je przed zapisem.");
      return;
    }

    if (
      selectedCategory?.parameterTemplates.some((template) => {
        const value = parameterValues[template.code] ?? "";
        return template.required && value.trim().length === 0;
      })
    ) {
      setError(
        "Uzupelnij wymagane parametry wspolne dla importowanej kategorii.",
      );
      return;
    }

    const sharedLeadTime = parsePositiveInteger(leadTimeDays, 3);
    const normalizedUnit = unit.trim() || "szt.";

    const payload = previewRows.map(
      (row) =>
        ({
          categoryId,
          name: row.name.trim(),
          sku: row.sku.trim(),
          unit: normalizedUnit,
          quantityOnHand: row.quantityOnHand,
          quantityReserved: 0,
          minimumStock: row.minimumStock,
          reorderQuantity: row.reorderQuantity,
          leadTimeDays: sharedLeadTime,
          location: row.location,
          supplierName: row.supplierName || null,
          unitCost: null,
          linkedDepartmentId: linkedDepartmentId || null,
          linkedAssetId: linkedAssetId || null,
          linkedMachineCategoryId: linkedMachineCategoryId || null,
          parameterValues,
          criticality,
          notes: normalizeOptionalText(notes) || null,
        }) satisfies CreateInventoryItemInput,
    );

    const result = await onSubmit(payload);
    if (result.failures.length > 0) {
      setError(
        result.failures
          .slice(0, 3)
          .map((failure) => `${failure.label}: ${failure.message}`)
          .join(" | "),
      );
      return;
    }

    setError("");
  };

  return (
    <ModalShell title="Dodaj wiele pozycji magazynowych" onClose={onClose}>
      {error ? <ModalError>{error}</ModalError> : null}

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div>
            <div className="text-sm font-semibold text-white">
              Ustawienia wspolne
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Wszystkie puste kolumny we wklejonych wierszach zostana
              uzupelnione tymi wartosciami.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Kategoria">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className={inputClassName}
              >
                <option value="">Wybierz kategorie</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Krytycznosc">
              <select
                value={criticality}
                onChange={(event) =>
                  setCriticality(event.target.value as InventoryCriticality)
                }
                className={inputClassName}
              >
                <option value="low">Standard</option>
                <option value="medium">Wazna</option>
                <option value="high">Krytyczna</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Jednostka">
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Stan startowy">
              <input
                type="number"
                min="0"
                value={quantityOnHand}
                onChange={(event) => setQuantityOnHand(event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Minimum">
              <input
                type="number"
                min="0"
                value={minimumStock}
                onChange={(event) => setMinimumStock(event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Partia zakupu">
              <input
                type="number"
                min="0"
                value={reorderQuantity}
                onChange={(event) => setReorderQuantity(event.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Lead time [dni]">
              <input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(event) => setLeadTimeDays(event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Lokalizacja domyslna">
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="Dostawca domyslny">
              <input
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                className={inputClassName}
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Powiazany dzial">
              <select
                value={linkedDepartmentId}
                onChange={(event) => setLinkedDepartmentId(event.target.value)}
                className={inputClassName}
              >
                <option value="">Brak</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Powiazana kategoria maszyn">
              <select
                value={linkedMachineCategoryId}
                onChange={(event) =>
                  setLinkedMachineCategoryId(event.target.value)
                }
                className={inputClassName}
              >
                <option value="">Brak</option>
                {machineCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Powiazana maszyna">
              <select
                value={linkedAssetId}
                onChange={(event) => setLinkedAssetId(event.target.value)}
                className={inputClassName}
              >
                <option value="">Brak</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.code})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedCategory &&
          selectedCategory.parameterTemplates.length > 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
              <div className="mb-3 text-sm font-semibold text-white">
                Wspolne parametry dla wszystkich importowanych pozycji
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {selectedCategory.parameterTemplates.map((template) => (
                  <Field
                    key={template.id}
                    label={`${template.name}${template.unit ? ` [${template.unit}]` : ""}${template.required ? " *" : ""}`}
                  >
                    {template.type === "select" ? (
                      <select
                        value={parameterValues[template.code] ?? ""}
                        onChange={(event) =>
                          setParameterValues((current) => ({
                            ...current,
                            [template.code]: event.target.value,
                          }))
                        }
                        className={inputClassName}
                      >
                        <option value="">Wybierz</option>
                        {template.options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : template.type === "boolean" ? (
                      <select
                        value={parameterValues[template.code] ?? ""}
                        onChange={(event) =>
                          setParameterValues((current) => ({
                            ...current,
                            [template.code]: event.target.value,
                          }))
                        }
                        className={inputClassName}
                      >
                        <option value="">Nie ustawiono</option>
                        <option value="true">Tak</option>
                        <option value="false">Nie</option>
                      </select>
                    ) : (
                      <input
                        type={template.type === "number" ? "number" : "text"}
                        value={parameterValues[template.code] ?? ""}
                        onChange={(event) =>
                          setParameterValues((current) => ({
                            ...current,
                            [template.code]: event.target.value,
                          }))
                        }
                        className={inputClassName}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          ) : null}

          <Field label="Uwagi wspolne">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className={inputClassName}
              placeholder="Ta notatka trafi do wszystkich nowo dodanych pozycji."
            />
          </Field>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div>
            <div className="text-sm font-semibold text-white">
              Wklej liste pozycji
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Format jednego wiersza: nazwa; SKU; stan; minimum; partia;
              lokalizacja; dostawca
            </p>
          </div>

          <textarea
            value={rawLines}
            onChange={(event) => setRawLines(event.target.value)}
            rows={12}
            className={inputClassName}
            placeholder={[
              "Lozysko 6204;LOZ-6204;12;4;8;A-01-01;SKF",
              "Pas klinowy B-52;;6;2;4;;",
              "Filtr oleju;FIL-OIL-01;3;1;2;B-02-04;HydroParts",
            ].join("\n")}
          />

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  Podglad importu
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {previewRows.length} wierszy gotowych do utworzenia
                </div>
              </div>
              {duplicateSkuSet.size > 0 ? (
                <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2 py-1 text-[11px] font-semibold text-rose-100">
                  Zduplikowane SKU: {duplicateSkuSet.size}
                </span>
              ) : null}
            </div>

            <div className="mt-3 max-h-72 space-y-2 overflow-auto">
              {previewRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {row.lineNumber}. {row.name || "Brak nazwy"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.sku} · stan {row.quantityOnHand} · min{" "}
                        {row.minimumStock} · partia {row.reorderQuantity}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.location || "Brak lokalizacji"}
                        {row.supplierName ? ` · ${row.supplierName}` : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {duplicateSkuSet.has(row.sku) ? (
                        <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2 py-0.5 text-[11px] text-rose-100">
                          Duplikat SKU
                        </span>
                      ) : null}
                      {row.warnings.map((warning) => (
                        <span
                          key={`${row.id}-${warning}`}
                          className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2 py-0.5 text-[11px] text-amber-100"
                        >
                          {warning}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {previewRows.length === 0 ? (
                <EmptyState text="Po wklejeniu listy zobaczysz tutaj podglad pozycji i automatycznie uzupelnione pola." />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ModalActions
        onClose={onClose}
        onSubmit={() => {
          void handleSubmit();
        }}
        submitLabel="Dodaj wszystkie pozycje"
      />
    </ModalShell>
  );
}

function InventoryProcurementModal({
  open,
  items,
  categories,
  departments,
  workOrders,
  maintenancePlans,
  recommendedQuantityByItemId,
  prefillItemId,
  onClose,
  onSubmit,
}: {
  open: boolean;
  items: Array<{
    id: string;
    name: string;
    sku: string;
    supplierName?: string | null;
    categoryId: string;
    unit: string;
    linkedDepartmentId?: string | null;
  }>;
  categories: InventoryCategory[];
  departments: { id: string; name: string }[];
  workOrders: { id: string; number: string; title: string }[];
  maintenancePlans: { id: string; title: string }[];
  recommendedQuantityByItemId: Record<string, number>;
  prefillItemId: string;
  onClose: () => void;
  onSubmit: (input: CreateInventoryProcurementInput) => void;
}) {
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [supplierName, setSupplierName] = useState("");
  const [requestedByDepartmentId, setRequestedByDepartmentId] = useState("");
  const [linkedWorkOrderId, setLinkedWorkOrderId] = useState("");
  const [linkedMaintenancePlanId, setLinkedMaintenancePlanId] = useState("");
  const [expectedDeliveryAtUtc, setExpectedDeliveryAtUtc] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const nextItemId = prefillItemId || items[0]?.id || "";
    setItemId(nextItemId);
    setQuantity(String(recommendedQuantityByItemId[nextItemId] ?? 1));
    setSupplierName("");
    setRequestedByDepartmentId("");
    setLinkedWorkOrderId("");
    setLinkedMaintenancePlanId("");
    setExpectedDeliveryAtUtc("");
    setNotes("");
    setError("");
  }, [items, open, prefillItemId, recommendedQuantityByItemId]);

  useEffect(() => {
    if (!open) return;

    const selectedItem = items.find((item) => item.id === itemId);
    const selectedCategory = categories.find(
      (category) => category.id === selectedItem?.categoryId,
    );

    if (selectedItem) {
      setQuantity(String(recommendedQuantityByItemId[selectedItem.id] ?? 1));

      if (selectedItem.supplierName || selectedCategory?.defaultSupplier) {
        setSupplierName(
          selectedItem.supplierName ?? selectedCategory?.defaultSupplier ?? "",
        );
      }

      if (selectedItem.linkedDepartmentId) {
        setRequestedByDepartmentId(selectedItem.linkedDepartmentId);
      }
    }
  }, [categories, itemId, items, open, recommendedQuantityByItemId]);

  if (!open) return null;

  const selectedItem = items.find((item) => item.id === itemId);
  const selectedCategory = categories.find(
    (category) => category.id === selectedItem?.categoryId,
  );

  const handleSubmit = () => {
    const parsedQuantity = parseNonNegativeNumber(quantity);

    if (!itemId) {
      setError("Wybierz pozycje magazynowa.");
      return;
    }

    if (parsedQuantity <= 0) {
      setError("Ilosc zamowienia musi byc wieksza od zera.");
      return;
    }

    onSubmit({
      itemId,
      quantity: parsedQuantity,
      supplierName: normalizeOptionalText(supplierName) || null,
      requestedByDepartmentId: requestedByDepartmentId || null,
      linkedWorkOrderId: linkedWorkOrderId || null,
      linkedMaintenancePlanId: linkedMaintenancePlanId || null,
      expectedDeliveryAtUtc: expectedDeliveryAtUtc || null,
      notes: normalizeOptionalText(notes) || null,
    });
  };

  return (
    <ModalShell title="Nowe zaopatrzenie" onClose={onClose}>
      {error ? <ModalError>{error}</ModalError> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Pozycja">
          <select
            value={itemId}
            onChange={(event) => setItemId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Wybierz pozycje</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.sku})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ilosc">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={inputClassName}
          />
        </Field>
      </div>

      {selectedItem ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-300">
          <div className="font-semibold text-white">{selectedItem.name}</div>
          <div className="mt-1 text-xs text-slate-500">
            {selectedCategory?.name ?? "Bez kategorii"} · jednostka{" "}
            {selectedItem.unit}
          </div>
          {recommendedQuantityByItemId[selectedItem.id] ? (
            <div className="mt-2 text-xs text-emerald-200">
              Sugestia systemu: {recommendedQuantityByItemId[selectedItem.id]}{" "}
              {selectedItem.unit}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Dostawca">
          <input
            value={supplierName}
            onChange={(event) => setSupplierName(event.target.value)}
            className={inputClassName}
          />
        </Field>

        <Field label="ETA">
          <input
            type="date"
            value={expectedDeliveryAtUtc}
            onChange={(event) => setExpectedDeliveryAtUtc(event.target.value)}
            className={inputClassName}
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Dzial wnioskujacy">
          <select
            value={requestedByDepartmentId}
            onChange={(event) => setRequestedByDepartmentId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Brak</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Powiazane zlecenie">
          <select
            value={linkedWorkOrderId}
            onChange={(event) => setLinkedWorkOrderId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Brak</option>
            {workOrders.map((workOrder) => (
              <option key={workOrder.id} value={workOrder.id}>
                {workOrder.number} · {workOrder.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Powiazany plan">
          <select
            value={linkedMaintenancePlanId}
            onChange={(event) => setLinkedMaintenancePlanId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Brak</option>
            {maintenancePlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Uwagi">
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className={inputClassName}
          placeholder="Powod zakupu, preferowany termin, wymagania dostawy..."
        />
      </Field>

      <ModalActions
        onClose={onClose}
        onSubmit={handleSubmit}
        submitLabel="Utworz zakup"
      />
    </ModalShell>
  );
}

const inputClassName =
  "rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="text-base font-bold text-white">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Zamknij
          </button>
        </div>

        <div className="max-h-[calc(90vh-4.5rem)] space-y-4 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  onClose,
  onSubmit,
  submitLabel,
}: {
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
      >
        Anuluj
      </button>

      <button
        type="button"
        onClick={onSubmit}
        className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-4 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function ModalError({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-rose-400/25 bg-rose-400/[0.08] px-3 py-2 text-sm text-rose-100">
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
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

function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      {action}
    </div>
  );
}

function PanelTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-2 py-2 text-xs font-bold uppercase tracking-[0.1em] transition",
        active
          ? "border-cyan-400/35 bg-cyan-400/[0.10] text-cyan-100"
          : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
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

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-semibold text-slate-100">
        {value}
      </div>
    </div>
  );
}

function CriticalityBadge({
  criticality,
}: {
  criticality: InventoryCriticality;
}) {
  const label =
    criticality === "high"
      ? "Krytyczna"
      : criticality === "medium"
        ? "Ważna"
        : "Standard";

  const className =
    criticality === "high"
      ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-100"
      : criticality === "medium"
        ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-100"
        : "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const label =
    urgency === "high"
      ? "Pilne"
      : urgency === "medium"
        ? "Ważne"
        : "Do zaplanowania";

  const className =
    urgency === "high"
      ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-100"
      : urgency === "medium"
        ? "border-amber-400/25 bg-amber-400/[0.08] text-amber-100"
        : "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function ProcurementBadge({ status }: { status: string }) {
  return (
    <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2 py-0.5 text-xs font-semibold text-cyan-100">
      {procurementStatusLabel(status as never)}
    </span>
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

function formatQuantity(value: number, unit: string) {
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value)} ${unit}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}
