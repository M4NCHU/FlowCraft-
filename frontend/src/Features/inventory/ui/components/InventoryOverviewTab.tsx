import { Link } from "react-router-dom";
import type {
  InventoryItem,
  InventoryItemInsight,
  InventoryProcurementOrder,
  InventorySuggestion,
} from "../../model/useInventoryWorkspace";
import {
  procurementStatusLabel,
  procurementStatusTone,
  serviceTypeLabel,
  serviceTypeTone,
} from "../../model/useInventoryWorkspace";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatQuantity(value: number, unit: string) {
  return `${new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value)} ${unit}`;
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning" | "info" | "success";
}) {
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50/50"
      : tone === "info"
        ? "border-sky-200 bg-sky-50/50"
        : tone === "success"
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${classes}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">
      {text}
    </div>
  );
}

interface OverviewTabProps {
  metrics: {
    categoriesCount: number;
    activeItemsCount: number;
    lowStockCount: number;
    openProcurementsCount: number;
    reservedUnits: number;
    estimatedValue: number;
    itemsLinkedToOperations: number;
  };
  suggestions: InventorySuggestion[];
  items: InventoryItem[];
  insightsByItemId: Record<string, InventoryItemInsight>;
  procurements: InventoryProcurementOrder[];
  onCreateProcurement: (itemId: string) => void;
  onAdvanceProcurement: (procurementId: string) => void;
  workOrdersById: Record<string, { number: string; title: string }>;
  maintenancePlansById: Record<string, { title: string }>;
  assetsById: Record<string, { name: string; id: string }>;
}

export function InventoryOverviewTab({
  metrics,
  suggestions,
  items,
  insightsByItemId,
  procurements,
  onCreateProcurement,
  onAdvanceProcurement,
  workOrdersById,
  maintenancePlansById,
  assetsById,
}: OverviewTabProps) {
  const openProcurements = procurements.filter(
    (procurement) => procurement.status !== "received",
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Kategorie"
          value={String(metrics.categoriesCount)}
          hint="Szablony grupujace czesci, materialy i BHP"
        />
        <MetricCard
          label="Aktywne pozycje"
          value={String(metrics.activeItemsCount)}
          hint={`${metrics.itemsLinkedToOperations} powiazanych z serwisem lub planami`}
        />
        <MetricCard
          label="Ponizej minimum"
          value={String(metrics.lowStockCount)}
          hint="Pozycje wymagajace reakcji magazynu"
          tone={metrics.lowStockCount > 0 ? "warning" : "neutral"}
        />
        <MetricCard
          label="Otwarte zaopatrzenie"
          value={String(metrics.openProcurementsCount)}
          hint="Wnioski i zamowienia w toku"
          tone={metrics.openProcurementsCount > 0 ? "info" : "neutral"}
        />
        <MetricCard
          label="Zarezerwowane"
          value={String(metrics.reservedUnits)}
          hint="Sztuki zablokowane pod serwis lub produkcje"
        />
        <MetricCard
          label="Szacowana wartosc"
          value={formatCurrency(metrics.estimatedValue)}
          hint="Tylko pozycje aktywne z uzupelnionym kosztem"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Ryzyka i kolejka zaopatrzenia
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Sugestie zakupu wynikajace ze stanu magazynu i otwartych zadan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onCreateProcurement("")}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
            >
              Dodaj zakup
            </button>
          </div>

          <div className="space-y-3">
            {suggestions.slice(0, 5).map((suggestion) => {
              const item = items.find(
                (entry) => entry.id === suggestion.itemId,
              );
              const insight = insightsByItemId[suggestion.itemId];
              if (!item || !insight) return null;

              return (
                <div
                  key={suggestion.itemId}
                  className="rounded-lg border border-slate-200 px-3 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900">
                        {item.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {suggestion.reason}
                      </div>
                    </div>
                    <span
                      className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                        suggestion.urgency === "high"
                          ? "border-rose-200 bg-rose-50 text-rose-800"
                          : suggestion.urgency === "medium"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-slate-200 bg-slate-50 text-slate-700",
                      ].join(" ")}
                    >
                      {suggestion.urgency === "high"
                        ? "Pilne"
                        : suggestion.urgency === "medium"
                          ? "Wazne"
                          : "Do zaplanowania"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span>
                      Dostepne:{" "}
                      {formatQuantity(insight.availableQuantity, item.unit)}
                    </span>
                    <span>
                      Proponowany zakup:{" "}
                      {formatQuantity(suggestion.suggestedQuantity, item.unit)}
                    </span>
                    <span>Lead time: {item.leadTimeDays} dni</span>
                    {item.serviceType ? (
                      <span
                        className={[
                          "rounded-full border px-1.5 py-0.5 text-[10px]",
                          serviceTypeTone(item.serviceType),
                        ].join(" ")}
                      >
                        {serviceTypeLabel(item.serviceType)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onCreateProcurement(item.id)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Utworz zakup
                    </button>
                    {item.linkedAssetId ? (
                      <Link
                        to={`/machines/${item.linkedAssetId}`}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Powiazana maszyna
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {suggestions.length === 0 ? (
              <EmptyState text="Brak pozycji wymagajacych pilnej reakcji zakupowej." />
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Zamowienia i dostawy
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Monitoruj status zaopatrzenia i przyjmuj dostawy jednym
              kliknieciem.
            </p>
          </div>

          <div className="space-y-3">
            {openProcurements.slice(0, 6).map((procurement) => {
              const item = items.find(
                (entry) => entry.id === procurement.itemId,
              );

              return (
                <div
                  key={procurement.id}
                  className="rounded-lg border border-slate-200 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-900">
                      {item?.name ?? "Pozycja usunieta"}
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${procurementStatusTone(
                        procurement.status,
                      )}`}
                    >
                      {procurementStatusLabel(procurement.status)}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {formatQuantity(procurement.quantity, item?.unit ?? "szt.")}{" "}
                    -{" "}
                    {procurement.supplierName ||
                      item?.supplierName ||
                      "Brak dostawcy"}
                  </div>
                  {procurement.linkedWorkOrderId ? (
                    <div className="mt-1 text-xs text-slate-500">
                      Powiazane zlecenie:{" "}
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
                      onClick={() => onAdvanceProcurement(procurement.id)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Zmien status
                    </button>
                    {item?.linkedAssetId ? (
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

            {openProcurements.length === 0 ? (
              <EmptyState text="Brak otwartych zamowien magazynowych." />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
