import { useMemo } from "react";
import { Link } from "react-router-dom";
import type {
  InventoryItem,
  InventoryProcurementOrder,
} from "../../model/useInventoryWorkspace";
import {
  procurementStatusLabel,
  procurementStatusTone,
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

interface ProcurementsTabProps {
  procurements: InventoryProcurementOrder[];
  items: InventoryItem[];
  workOrdersById: Record<string, { number: string; title: string }>;
  maintenancePlansById: Record<string, { title: string }>;
  onAdvanceProcurement: (procurementId: string) => void;
}

export function InventoryProcurementsTab({
  procurements,
  items,
  workOrdersById,
  maintenancePlansById,
  onAdvanceProcurement,
}: ProcurementsTabProps) {
  const allProcurements = useMemo(
    () =>
      [...procurements].sort(
        (left, right) =>
          new Date(right.requestedAtUtc).getTime() -
          new Date(left.requestedAtUtc).getTime(),
      ),
    [procurements],
  );

  const openCount = useMemo(
    () => procurements.filter((p) => p.status !== "received").length,
    [procurements],
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Zamowienia i dostawy
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Historia i biezacy status wszystkich zamowien magazynowych.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          {openCount} otwartych / {procurements.length} lacznie
        </div>
      </div>

      <div className="space-y-3">
        {allProcurements.map((procurement) => {
          const item = items.find((entry) => entry.id === procurement.itemId);

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
                {formatQuantity(procurement.quantity, item?.unit ?? "szt.")} -{" "}
                {procurement.supplierName ||
                  item?.supplierName ||
                  "Brak dostawcy"}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Zgloszono:{" "}
                {new Date(procurement.requestedAtUtc).toLocaleDateString(
                  "pl-PL",
                )}
                {procurement.expectedDeliveryAtUtc
                  ? ` · ETA: ${new Date(procurement.expectedDeliveryAtUtc).toLocaleDateString("pl-PL")}`
                  : ""}
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
                {procurement.status !== "received" ? (
                  <button
                    type="button"
                    onClick={() => onAdvanceProcurement(procurement.id)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Zmien status
                  </button>
                ) : null}
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

        {allProcurements.length === 0 ? (
          <EmptyState text="Brak zamowien magazynowych." />
        ) : null}
      </div>
    </div>
  );
}
