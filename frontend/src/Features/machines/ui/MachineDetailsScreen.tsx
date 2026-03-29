import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { OperationalStatusBadge } from "../../../shared/ui/OperationalStatusBadge";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { employeesApi } from "../../employees/api/employeesApi";
import type { EmployeeDto } from "../../employees/api/contracts";
import { failureReportsApi } from "../../incidents/api/failureReportsApi";
import {
  FailureSeverity,
  FailureStatus,
  type FailureReportDto,
} from "../../incidents/api/contracts";
import { maintenancePlansApi } from "../../maintenance/api/maintenancePlansApi";
import {
  MaintenanceOccurrenceStatus,
  MaintenanceTriggerMode,
  type MaintenancePlanDto,
} from "../../maintenance/api/contracts";
import { workOrdersApi } from "../../work-orders/api/workOrdersApi";
import {
  WorkOrderSource,
  WorkOrderStatus,
  type WorkOrderDto,
} from "../../work-orders/api/contracts";
import { assetCategoriesApi } from "../api/assetCategoriesApi";
import { assetsApi } from "../api/assetsApi";
import {
  AssetMeterType,
  AssetStatus,
  AssetType,
  type AssetCategoryDto,
  type AssetDetailsDto,
} from "../api/contracts";
import {
  buildMachineParameterPayload,
  buildMachineParameterValueMap,
  findMissingRequiredMachineParameter,
  haveMachineParameterValuesChanged,
} from "../model/parameterValues";
import { MachineParameterFormFields } from "./Components/MachineParameterFormFields";

const statusOptions = [
  { value: AssetStatus.Available, label: "Dostępna" },
  { value: AssetStatus.InUse, label: "W użyciu" },
  { value: AssetStatus.InMaintenance, label: "W serwisie" },
  { value: AssetStatus.Broken, label: "Uszkodzona" },
  { value: AssetStatus.Retired, label: "Wycofana" },
];

const maintenanceStatusLabels: Record<MaintenanceOccurrenceStatus, string> = {
  [MaintenanceOccurrenceStatus.Upcoming]: "Zaplanowany",
  [MaintenanceOccurrenceStatus.DueSoon]: "Wkrótce",
  [MaintenanceOccurrenceStatus.Overdue]: "Po terminie",
  [MaintenanceOccurrenceStatus.Completed]: "Wykonany",
  [MaintenanceOccurrenceStatus.Inactive]: "Nieaktywny",
};

const meterLabels: Record<AssetMeterType, string> = {
  [AssetMeterType.OperatingHours]: "Godziny pracy",
  [AssetMeterType.ProductionCycles]: "Cykle produkcyjne",
  [AssetMeterType.ProducedBatches]: "Partie produkcyjne",
};

const severityLabels: Record<FailureSeverity, string> = {
  [FailureSeverity.Low]: "Niska",
  [FailureSeverity.Medium]: "Średnia",
  [FailureSeverity.High]: "Wysoka",
  [FailureSeverity.Critical]: "Krytyczna",
};

const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.New]: "Nowe",
  [WorkOrderStatus.Assigned]: "Przypisane",
  [WorkOrderStatus.InProgress]: "W toku",
  [WorkOrderStatus.WaitingForParts]: "Czeka na części",
  [WorkOrderStatus.Done]: "Wykonane",
  [WorkOrderStatus.Cancelled]: "Anulowane",
};

const workOrderSourceLabels: Record<WorkOrderSource, string> = {
  [WorkOrderSource.Manual]: "Ręczne",
  [WorkOrderSource.FailureReport]: "Z awarii",
  [WorkOrderSource.PreventiveMaintenance]: "Z przeglądu",
};

function formatDateTime(value?: string | null) {
  if (!value) return "Brak danych";

  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function assetStatusTone(status: AssetStatus) {
  switch (status) {
    case AssetStatus.Available:
      return "success" as const;
    case AssetStatus.InUse:
      return "info" as const;
    case AssetStatus.InMaintenance:
      return "warning" as const;
    case AssetStatus.Broken:
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function maintenanceTone(status: MaintenanceOccurrenceStatus) {
  switch (status) {
    case MaintenanceOccurrenceStatus.Completed:
      return "success" as const;
    case MaintenanceOccurrenceStatus.DueSoon:
      return "warning" as const;
    case MaintenanceOccurrenceStatus.Overdue:
      return "danger" as const;
    case MaintenanceOccurrenceStatus.Upcoming:
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

function severityTone(severity: FailureSeverity) {
  switch (severity) {
    case FailureSeverity.Low:
      return "info" as const;
    case FailureSeverity.Medium:
      return "warning" as const;
    case FailureSeverity.High:
    case FailureSeverity.Critical:
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

function workOrderTone(status: WorkOrderStatus) {
  switch (status) {
    case WorkOrderStatus.Done:
      return "success" as const;
    case WorkOrderStatus.WaitingForParts:
      return "warning" as const;
    case WorkOrderStatus.Cancelled:
      return "neutral" as const;
    case WorkOrderStatus.InProgress:
      return "info" as const;
    default:
      return "danger" as const;
  }
}

function nextDueLabel(plan: MaintenancePlanDto) {
  if (plan.triggerMode === MaintenanceTriggerMode.Meter) {
    const meterLabel = meterLabels[plan.meterType ?? AssetMeterType.OperatingHours];
    return `${meterLabel}: ${plan.nextDueMeterValue ?? "-"}`;
  }

  return formatDateTime(plan.nextDueAtUtc ?? plan.startsAtUtc);
}

function employeeName(employee?: EmployeeDto) {
  if (!employee) return "Nieprzypisany pracownik";
  return `${employee.firstName} ${employee.lastName}`;
}

function employeeCapabilityLabel(employee: EmployeeDto, categoryId: string) {
  const skill = employee.skills.find((item) => item.assetCategoryId === categoryId);
  if (!skill) return "Brak kompetencji";

  const scopes = [
    skill.canOperate ? "obsługa" : null,
    skill.canMaintain ? "UR" : null,
    skill.canApproveMaintenance ? "akceptacja" : null,
  ].filter(Boolean);

  return scopes.length > 0 ? scopes.join(" • ") : "Kompetencja bez uprawnień operacyjnych";
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

function DetailGridItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-900">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-4 shadow">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmployeeList({
  employees,
  categoryId,
  emptyText,
}: {
  employees: EmployeeDto[];
  categoryId: string;
  emptyText: string;
}) {
  if (employees.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {employees.map((employee) => (
        <div
          key={employee.id}
          className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
        >
          <div>
            <div className="text-sm font-medium text-slate-900">
              {employee.firstName} {employee.lastName}
            </div>
            <div className="text-xs text-slate-500">
              {employee.jobTitle ?? "Brak stanowiska"}
            </div>
          </div>
          <div className="text-xs text-slate-500">{employeeCapabilityLabel(employee, categoryId)}</div>
        </div>
      ))}
    </div>
  );
}

export function MachineDetailsScreen() {
  const { id } = useParams();
  const [machine, setMachine] = useState<AssetDetailsDto | null>(null);
  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [incidents, setIncidents] = useState<FailureReportDto[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderDto[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUsage, setSavingUsage] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<AssetStatus>(AssetStatus.Available);
  const [usageMeterType, setUsageMeterType] = useState<AssetMeterType>(
    AssetMeterType.OperatingHours
  );
  const [usageReadingValue, setUsageReadingValue] = useState("");
  const [usageNotes, setUsageNotes] = useState("");

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [asset, categoryData, reports, orders, plans, employeeData] = await Promise.all([
        assetsApi.getById(id),
        assetCategoriesApi.list({ assetType: AssetType.Machine, includeInactive: false }),
        failureReportsApi.list({ openOnly: false }),
        workOrdersApi.list(),
        maintenancePlansApi.list({ assetId: id, includeInactive: true }),
        employeesApi.list({ includeInactive: false }),
      ]);

      setMachine(asset);
      setCategories(categoryData ?? []);
      setEmployees(employeeData ?? []);
      setStatus(asset.status);
      setSelectedCategoryId(asset.categoryId ?? "");
      setParameterValues(buildMachineParameterValueMap(asset.parameters));
      setIncidents((reports ?? []).filter((report) => report.assetId === id));
      setWorkOrders((orders ?? []).filter((order) => order.assetId === id));
      setMaintenancePlans(plans ?? []);
      setUsageMeterType(asset.usageSummaries[0]?.meterType ?? AssetMeterType.OperatingHours);
      setUsageReadingValue("");
      setUsageNotes("");
    } catch (err) {
      setError(toApiError(err, "Nie udało się pobrać szczegółów maszyny."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [id]);

  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee] as const)),
    [employees]
  );

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  const parameterDefinitions = useMemo(() => {
    if (selectedCategory) return selectedCategory.parameters;
    return machine?.parameters ?? [];
  }, [machine?.parameters, selectedCategory]);

  const missingRequiredParameter = findMissingRequiredMachineParameter(
    parameterDefinitions,
    parameterValues
  );
  const hasParameterChanges = haveMachineParameterValuesChanged(
    parameterDefinitions,
    parameterValues
  );

  const canSave =
    !!machine &&
    !saving &&
    !missingRequiredParameter &&
    (status !== machine.status ||
      selectedCategoryId !== (machine.categoryId ?? "") ||
      hasParameterChanges);

  const handleCategoryChange = (value: string) => {
    setSelectedCategoryId(value);

    const nextCategory = categories.find((category) => category.id === value);
    if (!nextCategory) {
      setParameterValues({});
      return;
    }

    if (machine && value === machine.categoryId) {
      setParameterValues(buildMachineParameterValueMap(machine.parameters));
      return;
    }

    setParameterValues(buildMachineParameterValueMap(nextCategory.parameters));
  };

  const handleSave = async () => {
    if (!machine || !id) return;

    if (missingRequiredParameter) {
      setError(
        new ApiError(400, `Parametr "${missingRequiredParameter.name}" jest wymagany.`, null)
      );
      return;
    }

    setSaving(true);

    try {
      const updated = await assetsApi.update(id, {
        name: machine.name,
        code: machine.code,
        type: machine.type,
        status,
        categoryId: selectedCategoryId || null,
        category: null,
        description: machine.description ?? null,
        serialNumber: machine.serialNumber ?? null,
        manufacturer: machine.manufacturer ?? null,
        model: machine.model ?? null,
        isMobile: machine.isMobile,
        notes: machine.notes ?? null,
        parameters: buildMachineParameterPayload(parameterDefinitions, parameterValues),
      });

      setMachine(updated);
      setStatus(updated.status);
      setSelectedCategoryId(updated.categoryId ?? "");
      setParameterValues(buildMachineParameterValueMap(updated.parameters));
    } catch (err) {
      setError(toApiError(err, "Nie udało się zapisać zmian maszyny."));
    } finally {
      setSaving(false);
    }
  };

  const handleAddUsageReading = async () => {
    if (!id || !usageReadingValue.trim()) return;

    setSavingUsage(true);
    setError(null);

    try {
      await assetsApi.addUsageReading(id, {
        meterType: usageMeterType,
        readingValue: Number(usageReadingValue),
        recordedByEmployeeId: null,
        notes: usageNotes.trim() || null,
        recordedAtUtc: new Date().toISOString(),
      });
      await maintenancePlansApi.syncAutoWorkOrders(id);
      await loadData();
    } catch (err) {
      setError(toApiError(err, "Nie udało się zapisać odczytu licznika."));
    } finally {
      setSavingUsage(false);
    }
  };

  const activeIncidents = useMemo(
    () =>
      incidents
        .filter(
          (incident) =>
            incident.status !== FailureStatus.Resolved &&
            incident.status !== FailureStatus.Closed
        )
        .sort((left, right) => Date.parse(right.reportedAtUtc) - Date.parse(left.reportedAtUtc)),
    [incidents]
  );

  const activeWorkOrders = useMemo(
    () =>
      workOrders
        .filter(
          (workOrder) =>
            workOrder.status !== WorkOrderStatus.Done &&
            workOrder.status !== WorkOrderStatus.Cancelled
        )
        .sort(
          (left, right) => Date.parse(right.requestedAtUtc) - Date.parse(left.requestedAtUtc)
        ),
    [workOrders]
  );

  const sortedMaintenancePlans = useMemo(
    () =>
      [...maintenancePlans].sort((left, right) => {
        const leftValue =
          left.triggerMode === MaintenanceTriggerMode.Calendar
            ? Date.parse(left.nextDueAtUtc ?? left.startsAtUtc)
            : left.nextDueMeterValue ?? Number.MAX_SAFE_INTEGER;
        const rightValue =
          right.triggerMode === MaintenanceTriggerMode.Calendar
            ? Date.parse(right.nextDueAtUtc ?? right.startsAtUtc)
            : right.nextDueMeterValue ?? Number.MAX_SAFE_INTEGER;
        return leftValue - rightValue;
      }),
    [maintenancePlans]
  );

  const nextMaintenancePlan = sortedMaintenancePlans.find((plan) => plan.isActive);
  const recentUsageReadings = [...(machine?.usageReadings ?? [])]
    .sort((left, right) => Date.parse(right.recordedAtUtc) - Date.parse(left.recordedAtUtc))
    .slice(0, 6);
  const currentAssignment = [...(machine?.assignments ?? [])]
    .sort((left, right) => Date.parse(right.assignedAtUtc) - Date.parse(left.assignedAtUtc))[0];
  const currentPlacement = [...(machine?.placements ?? [])]
    .filter((placement) => placement.isCurrent)
    .sort((left, right) => Date.parse(right.placedAtUtc) - Date.parse(left.placedAtUtc))[0];

  const categoryEmployees = employees.filter((employee) =>
    employee.skills.some((skill) => skill.assetCategoryId === selectedCategoryId)
  );
  const maintainers = categoryEmployees.filter((employee) =>
    employee.skills.some(
      (skill) => skill.assetCategoryId === selectedCategoryId && skill.canMaintain
    )
  );
  const operators = categoryEmployees.filter((employee) =>
    employee.skills.some(
      (skill) => skill.assetCategoryId === selectedCategoryId && skill.canOperate
    )
  );
  const approvers = categoryEmployees.filter((employee) =>
    employee.skills.some(
      (skill) =>
        skill.assetCategoryId === selectedCategoryId && skill.canApproveMaintenance
    )
  );

  if (loading && !machine) {
    return (
      <div className="rounded-xl bg-white p-6 shadow">Ładowanie szczegółów maszyny...</div>
    );
  }

  if (!machine) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
        {error?.message ?? "Nie znaleziono maszyny."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={machine.name}
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/machines"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Lista maszyn
            </Link>
            <Link
              to="/machine-categories"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Kategorie
            </Link>
            <Link
              to={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Przeglądy
            </Link>
            <Link
              to={`/activity?assetId=${encodeURIComponent(machine.id)}`}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Do zrobienia dziś
            </Link>
            <Link
              to={`/lean?create=1&title=${encodeURIComponent(
                `Kaizen dla maszyny ${machine.name}`
              )}&description=${encodeURIComponent(
                `Usprawnienie dla maszyny ${machine.name} (${machine.code}) w obszarze niezawodności, przeglądów lub przezbrojeń.`
              )}`}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj kaizen
            </Link>
          </div>
        }
      />

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error.message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-xl bg-white p-5 shadow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm text-slate-500">Kod: {machine.code}</div>
              <div className="mt-2 text-sm text-slate-600">
                {machine.description?.trim() || "Brak opisu maszyny."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <OperationalStatusBadge
                label={statusOptions.find((option) => option.value === status)?.label ?? "Status"}
                tone={assetStatusTone(status)}
              />
              <OperationalStatusBadge
                label={selectedCategory?.name ?? machine.category ?? "Bez kategorii"}
                tone="neutral"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <SummaryTile
              label="Otwarte awarie"
              value={String(activeIncidents.length)}
              hint={activeIncidents[0]?.title ?? "Brak aktywnych awarii"}
            />
            <SummaryTile
              label="Aktywne zlecenia"
              value={String(activeWorkOrders.length)}
              hint={activeWorkOrders[0]?.title ?? "Brak aktywnych zleceń"}
            />
            <SummaryTile
              label="Najbliższy przegląd"
              value={nextMaintenancePlan ? maintenanceStatusLabels[nextMaintenancePlan.currentStatus] : "-"}
              hint={nextMaintenancePlan ? nextDueLabel(nextMaintenancePlan) : "Brak planu"}
            />
            <SummaryTile
              label="Kompetencje UR"
              value={String(maintainers.length)}
              hint={`Operatorzy: ${operators.length}, akceptacja: ${approvers.length}`}
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailGridItem label="Model" value={machine.model ?? "-"} />
            <DetailGridItem label="Producent" value={machine.manufacturer ?? "-"} />
            <DetailGridItem label="Numer seryjny" value={machine.serialNumber ?? "-"} />
            <DetailGridItem label="Mobilna" value={machine.isMobile ? "Tak" : "Nie"} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to={`/maintenance?assetId=${encodeURIComponent(machine.id)}&create=1`}
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Dodaj plan przeglądu
            </Link>
            <Link
              to="/work-orders"
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Zlecenia serwisowe
            </Link>
            <Link
              to="/incidents"
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Awarie i usterki
            </Link>
            <Link
              to="/employees"
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Kompetencje pracowników
            </Link>
          </div>
        </section>

        <aside className="rounded-xl bg-white p-5 shadow">
          <div className="text-sm font-semibold text-slate-900">Status i konfiguracja</div>
          <div className="mt-4 space-y-3">
            <select
              value={status}
              onChange={(event) => setStatus(Number(event.target.value) as AssetStatus)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedCategoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Bez kategorii</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => void handleSave()}
              disabled={!canSave}
              className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>

            {missingRequiredParameter ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Uzupełnij parametr wymagany: {missingRequiredParameter.name}.
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Powiązania
              </div>
              <div className="mt-2 text-sm text-slate-700">
                Awarii: {machine.failureReportsCount} • Zleceń: {machine.workOrdersCount}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Ostatnie przypisanie
              </div>
              <div className="mt-2 text-sm text-slate-700">
                {currentAssignment
                  ? employeeName(employeeById.get(currentAssignment.employeeId))
                  : "Brak wydań maszyny"}
              </div>
              {currentAssignment ? (
                <div className="mt-1 text-xs text-slate-500">
                  {formatDateTime(currentAssignment.assignedAtUtc)}
                </div>
              ) : null}
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Pozycja na layoutcie
              </div>
              <div className="mt-2 text-sm text-slate-700">
                {currentPlacement
                  ? `Hala ${currentPlacement.hallId.slice(0, 8)} • sekcja ${currentPlacement.sectionId?.slice(0, 8) ?? "brak"}`
                  : "Brak aktywnego rozmieszczenia"}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Parametry techniczne"
          description="Zmiana kategorii od razu przełącza zestaw parametrów dla tej maszyny."
        >
          <MachineParameterFormFields
            parameters={parameterDefinitions}
            values={parameterValues}
            onChange={(parameterId, value) =>
              setParameterValues((current) => ({ ...current, [parameterId]: value }))
            }
            disabled={saving}
            emptyText="Ta maszyna nie ma jeszcze przypisanej kategorii z parametrami."
          />
        </SectionCard>

        <SectionCard
          title="Kompetencje dla kategorii"
          description="Tu widać od razu, kto może obsługiwać, serwisować i zatwierdzać przeglądy dla tej kategorii."
          action={
            <Link
              to="/employees"
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Zarządzaj kompetencjami
            </Link>
          }
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Utrzymanie ruchu
              </div>
              <EmployeeList
                employees={maintainers}
                categoryId={selectedCategoryId}
                emptyText="Brak pracowników UR dla tej kategorii."
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Operatorzy
              </div>
              <EmployeeList
                employees={operators}
                categoryId={selectedCategoryId}
                emptyText="Brak operatorów dla tej kategorii."
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Akceptacja przeglądów
              </div>
              <EmployeeList
                employees={approvers}
                categoryId={selectedCategoryId}
                emptyText="Brak osób zatwierdzających przeglądy."
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Liczniki eksploatacyjne"
          description="Odczyty uruchamiają przeglądy wykonywane po godzinach, cyklach lub partiach."
        >
          <div className="grid gap-3 md:grid-cols-3">
            {machine.usageSummaries.length > 0 ? (
              machine.usageSummaries.map((summary) => (
                <div key={summary.meterType} className="rounded-xl border border-slate-200 p-4">
                  <div className="text-sm font-medium text-slate-900">
                    {meterLabels[summary.meterType]}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {summary.latestReadingValue ?? "-"}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Ostatni odczyt: {formatDateTime(summary.latestRecordedAtUtc)}
                  </div>
                  <div className="mt-3 text-xs text-slate-600">
                    Następny próg: {summary.nextMaintenanceMeterValue ?? "-"}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Pozostało: {summary.remainingToNextMaintenance ?? "-"}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 md:col-span-3">
                Brak odczytów liczników. Dodaj pierwszy pomiar, aby uruchomić harmonogram po zużyciu.
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-medium text-slate-900">Dodaj odczyt</div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-slate-600">Typ licznika</span>
                  <select
                    value={usageMeterType}
                    onChange={(event) =>
                      setUsageMeterType(Number(event.target.value) as AssetMeterType)
                    }
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    {Object.values(AssetMeterType).map((value) =>
                      typeof value === "number" ? (
                        <option key={value} value={value}>
                          {meterLabels[value as AssetMeterType]}
                        </option>
                      ) : null
                    )}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm text-slate-600">Wartość</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={usageReadingValue}
                    onChange={(event) => setUsageReadingValue(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="np. 1250"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-sm text-slate-600">Notatka</span>
                  <input
                    value={usageNotes}
                    onChange={(event) => setUsageNotes(event.target.value)}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="np. po zmianie nocnej"
                  />
                </label>
              </div>

              <button
                onClick={() => void handleAddUsageReading()}
                disabled={!usageReadingValue.trim() || savingUsage}
                className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {savingUsage ? "Zapisywanie..." : "Zapisz odczyt"}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-medium text-slate-900">Historia odczytów</div>
              <div className="mt-3 space-y-2">
                {recentUsageReadings.length > 0 ? (
                  recentUsageReadings.map((reading) => (
                    <div key={reading.id} className="rounded-lg border border-slate-100 px-3 py-3 text-sm">
                      <div className="font-medium text-slate-900">
                        {meterLabels[reading.meterType]}: {reading.readingValue}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDateTime(reading.recordedAtUtc)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {reading.notes ?? "Bez notatki"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-sm text-slate-500">
                    Brak odczytów liczników.
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Przeglądy, awarie i zlecenia"
          description="Najważniejsze operacyjne informacje są zebrane w jednym miejscu."
        >
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Najbliższe przeglądy
                </div>
                <Link
                  to={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Otwórz harmonogram
                </Link>
              </div>
              <div className="space-y-2">
                {sortedMaintenancePlans.slice(0, 4).map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{plan.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{nextDueLabel(plan)}</div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OperationalStatusBadge
                          label={maintenanceStatusLabels[plan.currentStatus]}
                          tone={maintenanceTone(plan.currentStatus)}
                        />
                        <Link
                          to={`/maintenance?assetId=${encodeURIComponent(machine.id)}&planId=${encodeURIComponent(plan.id)}`}
                          className="text-xs font-medium text-sky-700 hover:underline"
                        >
                          Szczegóły
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedMaintenancePlans.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                    Brak planów przeglądów dla tej maszyny.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Otwarte awarie
                </div>
                <Link
                  to="/incidents"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Lista awarii
                </Link>
              </div>
              <div className="space-y-2">
                {activeIncidents.slice(0, 3).map((incident) => (
                  <div key={incident.id} className="rounded-xl border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{incident.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Zgłoszono: {formatDateTime(incident.reportedAtUtc)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OperationalStatusBadge
                          label={severityLabels[incident.severity]}
                          tone={severityTone(incident.severity)}
                        />
                        <Link
                          to={`/incidents/${incident.id}`}
                          className="text-xs font-medium text-sky-700 hover:underline"
                        >
                          Szczegóły
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {activeIncidents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                    Brak aktywnych awarii.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Aktywne zlecenia
                </div>
                <Link
                  to="/work-orders"
                  className="text-xs font-medium text-sky-700 hover:underline"
                >
                  Otwórz zlecenia
                </Link>
              </div>
              <div className="space-y-2">
                {activeWorkOrders.slice(0, 3).map((workOrder) => (
                  <div key={workOrder.id} className="rounded-xl border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{workOrder.title}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {workOrder.number} • {workOrderSourceLabels[workOrder.source]}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <OperationalStatusBadge
                          label={workOrderStatusLabels[workOrder.status]}
                          tone={workOrderTone(workOrder.status)}
                        />
                        <Link
                          to={`/work-orders/${workOrder.id}`}
                          className="text-xs font-medium text-sky-700 hover:underline"
                        >
                          Szczegóły
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
                {activeWorkOrders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                    Brak aktywnych zleceń serwisowych.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

