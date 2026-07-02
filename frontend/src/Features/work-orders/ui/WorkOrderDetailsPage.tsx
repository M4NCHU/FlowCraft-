import { type ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { employeesApi } from "../../employees/api/employeesApi";
import type { EmployeeDto } from "../../employees/api/contracts";
import { assetsApi } from "../../machines/api/assetsApi";
import type { AssetListItemDto } from "../../machines/api/contracts";
import { maintenancePlansApi } from "../../maintenance/api/maintenancePlansApi";
import type { MaintenancePlanDto } from "../../maintenance/api/contracts";
import {
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
  WorkOrderType,
  type WorkOrderDto,
} from "../api/contracts";
import { workOrdersApi } from "../api/workOrdersApi";
import { AddWorkOrderModal } from "./components/AddWorkOrderModal";

const statusOptions = [
  { value: WorkOrderStatus.New, label: "Nowe" },
  { value: WorkOrderStatus.Assigned, label: "Przypisane" },
  { value: WorkOrderStatus.InProgress, label: "W trakcie" },
  { value: WorkOrderStatus.WaitingForParts, label: "Oczekuje na części" },
  { value: WorkOrderStatus.Done, label: "Zakończone" },
  { value: WorkOrderStatus.Cancelled, label: "Anulowane" },
];

const priorityLabels: Record<WorkOrderPriority, string> = {
  [WorkOrderPriority.Low]: "Niski",
  [WorkOrderPriority.Medium]: "Średni",
  [WorkOrderPriority.High]: "Wysoki",
  [WorkOrderPriority.Critical]: "Krytyczny",
};

const typeLabels: Record<WorkOrderType, string> = {
  [WorkOrderType.CorrectiveMaintenance]: "Naprawa",
  [WorkOrderType.PreventiveMaintenance]: "Przegląd prewencyjny",
  [WorkOrderType.Inspection]: "Inspekcja",
  [WorkOrderType.Installation]: "Instalacja",
  [WorkOrderType.Relocation]: "Relokacja",
  [WorkOrderType.Other]: "Inne",
};

const sourceLabels: Record<WorkOrderSource, string> = {
  [WorkOrderSource.Manual]: "Ręczne",
  [WorkOrderSource.FailureReport]: "Z awarii",
  [WorkOrderSource.PreventiveMaintenance]: "Z planu przeglądu",
};

export function WorkOrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState<WorkOrderDto | null>(null);
  const [assets, setAssets] = useState<AssetListItemDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [maintenancePlan, setMaintenancePlan] = useState<MaintenancePlanDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [status, setStatus] = useState<WorkOrderStatus>(WorkOrderStatus.New);
  const [actualMinutes, setActualMinutes] = useState("");
  const [actualCost, setActualCost] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await workOrdersApi.getById(id);
        setWorkOrder(data);
        setStatus(data.status);
        setActualMinutes(data.actualMinutes != null ? String(data.actualMinutes) : "");
        setActualCost(data.actualCost != null ? String(data.actualCost) : "");
        setResolutionSummary(data.resolutionSummary ?? "");

        const [assetsData, employeeData, planData] = await Promise.all([
          assetsApi.list(),
          employeesApi.list({ includeInactive: false }),
          data.maintenancePlanId
            ? maintenancePlansApi.getById(data.maintenancePlanId)
            : Promise.resolve(null),
        ]);

        setAssets(assetsData ?? []);
        setEmployees(employeeData ?? []);
        setMaintenancePlan(planData);
      } catch (err) {
        setError(toApiError(err, "Nie udało się pobrać zlecenia."));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  const handleSave = async () => {
    if (!id || !workOrder) return;

    setSaving(true);
    try {
      const updated = await workOrdersApi.setStatus(id, {
        status,
        actualMinutes: actualMinutes ? Number(actualMinutes) : null,
        actualCost: actualCost ? Number(actualCost) : null,
        resolutionSummary: resolutionSummary.trim() || null,
      });
      setWorkOrder(updated);
      setStatus(updated.status);
    } catch (err) {
      setError(toApiError(err, "Nie udało się zapisać zlecenia."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl bg-white p-6 shadow">Ładowanie...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
        {error.message}
      </div>
    );
  }

  if (!workOrder) return <div>Nie znaleziono zlecenia.</div>;

  const asset = assets.find((entry) => entry.id === workOrder.assetId) ?? null;
  const assignedEmployee =
    employees.find((entry) => entry.id === workOrder.assignedToEmployeeId) ?? null;
  const requestedByEmployee =
    employees.find((entry) => entry.id === workOrder.requestedByEmployeeId) ?? null;

  return (
    <>
      <PageHeader
        title={`Zlecenie ${workOrder.number}`}
        eyebrow="Szczegoly zlecenia"
        description="Pelny kontekst zlecenia serwisowego: priorytet, termin, powiazana maszyna oraz wynik wykonania. To tutaj zamykasz obieg pracy i zapisujesz finalne rozliczenie."
        extra={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpenEdit(true)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Edytuj zlecenie
            </button>
            <button
              onClick={() => navigate(-1)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              Wróć
            </button>
          </div>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow md:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <Detail label="Tytuł" value={workOrder.title} />
            <Detail label="Priorytet" value={priorityLabels[workOrder.priority]} />
            <Detail label="Typ" value={typeLabels[workOrder.type]} />
            <Detail label="Źródło" value={sourceLabels[workOrder.source]} />
            <Detail
              label="Maszyna"
              value={
                asset ? (
                  <Link to={`/machines/${asset.id}`} className="text-sky-700 hover:underline">
                    {asset.name}
                  </Link>
                ) : (
                  "-"
                )
              }
            />
            <Detail
              label="Przypisany pracownik"
              value={
                assignedEmployee
                  ? `${assignedEmployee.firstName} ${assignedEmployee.lastName}`
                  : "-"
              }
            />
            <Detail
              label="Zgłaszający"
              value={
                requestedByEmployee
                  ? `${requestedByEmployee.firstName} ${requestedByEmployee.lastName}`
                  : "-"
              }
            />
            <Detail
              label="Termin"
              value={formatDateTime(workOrder.dueAtUtc ?? workOrder.requestedAtUtc)}
            />
            <Detail
              label="Planowany start"
              value={formatDateTime(workOrder.plannedStartAtUtc)}
            />
            <Detail
              label="Wystąpienie planu"
              value={formatDateTime(workOrder.plannedForOccurrenceUtc)}
            />
            <Detail
              label="Wyzwolenie licznikiem"
              value={workOrder.triggeredByMeterValue != null ? String(workOrder.triggeredByMeterValue) : "-"}
            />
            <Detail
              label="Planowany czas"
              value={
                workOrder.estimatedMinutes != null
                  ? `${workOrder.estimatedMinutes} min`
                  : "-"
              }
            />
            <Detail
              label="Planowany koszt"
              value={
                workOrder.estimatedCost != null
                  ? `${workOrder.estimatedCost} PLN`
                  : "-"
              }
            />
            <Detail
              label="Wykonawca zewnętrzny"
              value={workOrder.externalVendor ?? "-"}
            />
            <Detail
              label="Auto-utworzone"
              value={workOrder.autoCreated ? "Tak" : "Nie"}
            />
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="text-xs uppercase text-slate-500">Opis</div>
            <div className="mt-1 text-sm text-slate-900">{workOrder.description}</div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {workOrder.failureReportId ? (
              <Link
                to={`/incidents/${workOrder.failureReportId}`}
                className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                Przejdź do awarii
              </Link>
            ) : null}
            {maintenancePlan ? (
              <Link
                to={`/maintenance?planId=${encodeURIComponent(maintenancePlan.id)}`}
                className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                Plan przeglądu: {maintenancePlan.title}
              </Link>
            ) : null}
            {asset ? (
              <Link
                to={`/machines/${asset.id}`}
                className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                Szczegóły maszyny
              </Link>
            ) : null}
            <Link
              to={`/inventory${asset ? `?assetId=${encodeURIComponent(asset.id)}&workOrderId=${encodeURIComponent(workOrder.id)}` : `?workOrderId=${encodeURIComponent(workOrder.id)}`}`}
              className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              Sprawdz czesci w magazynie
            </Link>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <div className="text-sm font-semibold text-slate-900">Status i rozliczenie</div>
          <select
            value={status}
            onChange={(e) => setStatus(Number(e.target.value) as WorkOrderStatus)}
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            value={actualMinutes}
            onChange={(e) => setActualMinutes(e.target.value)}
            placeholder="Rzeczywisty czas [min]"
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            placeholder="Rzeczywisty koszt"
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={resolutionSummary}
            onChange={(e) => setResolutionSummary(e.target.value)}
            placeholder="Podsumowanie wykonanych prac"
            rows={4}
            className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Zapisywanie..." : "Zapisz"}
          </button>
        </div>
      </div>

      <AddWorkOrderModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        assets={assets}
        employees={employees}
        workOrder={workOrder}
        onSaved={(updated) => {
          setWorkOrder(updated);
        }}
      />
    </>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-900">{value}</div>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

