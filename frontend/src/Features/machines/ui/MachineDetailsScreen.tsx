import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { OperationalStatusBadge } from "../../../shared/ui/OperationalStatusBadge";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { employeesApi } from "../../employees/api/employeesApi";
import {
  EmployeeStatus,
  type EmployeeDto,
} from "../../employees/api/contracts";
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
  AssetAssignmentStatus,
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

type PanelTone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

type MachinePanelMode = "operations" | "meters" | "parameters" | "competences";

interface MachineEditorState {
  name: string;
  code: string;
  description: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  notes: string;
}

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
    const meterLabel =
      meterLabels[plan.meterType ?? AssetMeterType.OperatingHours];
    return `${meterLabel}: ${plan.nextDueMeterValue ?? "-"}`;
  }

  return formatDateTime(plan.nextDueAtUtc ?? plan.startsAtUtc);
}

function employeeName(employee?: EmployeeDto) {
  if (!employee) return "Nieprzypisany pracownik";

  return `${employee.firstName} ${employee.lastName}`;
}

function findRelevantSkill(
  employee: EmployeeDto,
  machineId: string,
  categoryId: string,
) {
  return (
    employee.skills.find((item) => item.assetId === machineId) ??
    employee.skills.find(
      (item) => !item.assetId && item.assetCategoryId === categoryId,
    )
  );
}

function employeeCapabilityLabel(
  employee: EmployeeDto,
  machineId: string,
  categoryId: string,
) {
  const skill = findRelevantSkill(employee, machineId, categoryId);
  if (!skill) return "Brak uprawnien";

  const scopes = [
    skill.canOperate ? "obsługa" : null,
    skill.canMaintain ? "UR" : null,
    skill.canApproveMaintenance ? "akceptacja" : null,
  ].filter(Boolean);

  const summary =
    scopes.length > 0
      ? scopes.join(" • ")
      : "Uprawnienie bez zakresu operacyjnego";

  return skill.isMachineSpecific
    ? `${summary} • maszyna`
    : `${summary} • kategoria`;
}

function formatDimension(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";

  return `${new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} m`;
}

function toDimensionInput(value?: number | null) {
  return value == null || !Number.isFinite(value) ? "" : String(value);
}

function parseOptionalPositiveNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return new ApiError(
      400,
      "Wymiary maszyny muszą być większe od zera.",
      null,
    );
  }

  return parsed;
}

function createMachineEditorState(
  machine?: AssetDetailsDto | null,
): MachineEditorState {
  return {
    name: machine?.name ?? "",
    code: machine?.code ?? "",
    description: machine?.description ?? "",
    serialNumber: machine?.serialNumber ?? "",
    manufacturer: machine?.manufacturer ?? "",
    model: machine?.model ?? "",
    notes: machine?.notes ?? "",
  };
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formatDimensionPreview(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "-";

  const parsed = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";

  return formatDimension(parsed);
}

function toneClass(tone: PanelTone) {
  const classes: Record<PanelTone, string> = {
    slate: "border-slate-800 bg-slate-950/60 text-slate-100",
    cyan: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
    rose: "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
    violet: "border-violet-400/25 bg-violet-400/[0.08] text-violet-100",
  };

  return classes[tone];
}

export function MachineDetailsScreen() {
  const { id } = useParams();
  const [machine, setMachine] = useState<AssetDetailsDto | null>(null);
  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [parameterValues, setParameterValues] = useState<
    Record<string, string>
  >({});
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [incidents, setIncidents] = useState<FailureReportDto[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderDto[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<
    MaintenancePlanDto[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingUsage, setSavingUsage] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [status, setStatus] = useState<AssetStatus>(AssetStatus.Available);
  const [editor, setEditor] = useState<MachineEditorState>(
    createMachineEditorState(),
  );
  const [footprintWidthMeters, setFootprintWidthMeters] = useState("");
  const [footprintLengthMeters, setFootprintLengthMeters] = useState("");
  const [usageMeterType, setUsageMeterType] = useState<AssetMeterType>(
    AssetMeterType.OperatingHours,
  );
  const [usageReadingValue, setUsageReadingValue] = useState("");
  const [usageNotes, setUsageNotes] = useState("");
  const [panelMode, setPanelMode] = useState<MachinePanelMode>("operations");
  const [openAssignmentModal, setOpenAssignmentModal] = useState(false);
  const [assigningEmployee, setAssigningEmployee] = useState(false);

  const loadData = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const [asset, categoryData, reports, orders, plans, employeeData] =
        await Promise.all([
          assetsApi.getById(id),
          assetCategoriesApi.list({
            assetType: AssetType.Machine,
            includeInactive: false,
          }),
          failureReportsApi.list({ openOnly: false }),
          workOrdersApi.list(),
          maintenancePlansApi.list({ assetId: id, includeInactive: true }),
          employeesApi.list({ includeInactive: false }),
        ]);

      setMachine(asset);
      setCategories(categoryData ?? []);
      setEmployees(employeeData ?? []);
      setStatus(asset.status);
      setEditor(createMachineEditorState(asset));
      setFootprintWidthMeters(toDimensionInput(asset.footprintWidthMeters));
      setFootprintLengthMeters(toDimensionInput(asset.footprintLengthMeters));
      setSelectedCategoryId(asset.categoryId ?? "");
      setParameterValues(buildMachineParameterValueMap(asset.parameters));
      setIncidents((reports ?? []).filter((report) => report.assetId === id));
      setWorkOrders((orders ?? []).filter((order) => order.assetId === id));
      setMaintenancePlans(plans ?? []);
      setUsageMeterType(
        asset.usageSummaries[0]?.meterType ?? AssetMeterType.OperatingHours,
      );
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
    () =>
      new Map(employees.map((employee) => [employee.id, employee] as const)),
    [employees],
  );

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );

  const parameterDefinitions = useMemo(() => {
    if (selectedCategory) return selectedCategory.parameters;

    return machine?.parameters ?? [];
  }, [machine?.parameters, selectedCategory]);

  const missingRequiredParameter = findMissingRequiredMachineParameter(
    parameterDefinitions,
    parameterValues,
  );

  const hasParameterChanges = haveMachineParameterValuesChanged(
    parameterDefinitions,
    parameterValues,
  );

  const trimmedName = editor.name.trim();
  const trimmedCode = editor.code.trim();
  const normalizedDescription = normalizeOptionalText(editor.description);
  const normalizedSerialNumber = normalizeOptionalText(editor.serialNumber);
  const normalizedManufacturer = normalizeOptionalText(editor.manufacturer);
  const normalizedModel = normalizeOptionalText(editor.model);
  const normalizedNotes = normalizeOptionalText(editor.notes);

  const canSave =
    !!machine &&
    !saving &&
    !missingRequiredParameter &&
    !!trimmedName &&
    !!trimmedCode &&
    (trimmedName !== machine.name ||
      trimmedCode !== machine.code ||
      normalizedDescription !== (machine.description ?? null) ||
      normalizedSerialNumber !== (machine.serialNumber ?? null) ||
      normalizedManufacturer !== (machine.manufacturer ?? null) ||
      normalizedModel !== (machine.model ?? null) ||
      normalizedNotes !== (machine.notes ?? null) ||
      status !== machine.status ||
      footprintWidthMeters !== toDimensionInput(machine.footprintWidthMeters) ||
      footprintLengthMeters !==
        toDimensionInput(machine.footprintLengthMeters) ||
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

    if (!trimmedName) {
      setError(new ApiError(400, "Nazwa maszyny jest wymagana.", null));
      return;
    }

    if (!trimmedCode) {
      setError(new ApiError(400, "Kod maszyny jest wymagany.", null));
      return;
    }

    if (missingRequiredParameter) {
      setError(
        new ApiError(
          400,
          `Parametr "${missingRequiredParameter.name}" jest wymagany.`,
          null,
        ),
      );
      return;
    }

    const parsedFootprintWidth =
      parseOptionalPositiveNumber(footprintWidthMeters);
    if (parsedFootprintWidth instanceof ApiError) {
      setError(parsedFootprintWidth);
      return;
    }

    const parsedFootprintLength = parseOptionalPositiveNumber(
      footprintLengthMeters,
    );
    if (parsedFootprintLength instanceof ApiError) {
      setError(parsedFootprintLength);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await assetsApi.update(id, {
        name: trimmedName,
        code: trimmedCode,
        type: machine.type,
        status,
        categoryId: selectedCategoryId || null,
        category: null,
        description: normalizedDescription,
        serialNumber: normalizedSerialNumber,
        manufacturer: normalizedManufacturer,
        model: normalizedModel,
        footprintWidthMeters: parsedFootprintWidth,
        footprintLengthMeters: parsedFootprintLength,
        isMobile: machine.isMobile,
        notes: normalizedNotes,
        parameters: buildMachineParameterPayload(
          parameterDefinitions,
          parameterValues,
        ),
      });

      setMachine(updated);
      setStatus(updated.status);
      setEditor(createMachineEditorState(updated));
      setFootprintWidthMeters(toDimensionInput(updated.footprintWidthMeters));
      setFootprintLengthMeters(toDimensionInput(updated.footprintLengthMeters));
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

  const handleAssignEmployee = async (
    employeeId: string,
    dueBackAtUtc?: string | null,
    notes?: string | null,
  ) => {
    if (!id) return;

    setAssigningEmployee(true);
    setError(null);

    try {
      if (currentAssignment) {
        await assetsApi.returnAsset(id, {
          returnedAtUtc: new Date().toISOString(),
          notes: "Automatyczne zakonczenie poprzedniego przypisania.",
        });
      }

      await assetsApi.assign(id, {
        employeeId,
        issuedByEmployeeId: null,
        dueBackAtUtc: dueBackAtUtc
          ? new Date(dueBackAtUtc).toISOString()
          : null,
        notes: notes || null,
      });

      setOpenAssignmentModal(false);
      await loadData();
    } catch (err) {
      setError(
        toApiError(err, "Nie udało się przypisać pracownika do maszyny."),
      );
    } finally {
      setAssigningEmployee(false);
    }
  };

  const handleReturnAssignment = async () => {
    if (!id || !currentAssignment) return;

    setAssigningEmployee(true);
    setError(null);

    try {
      await assetsApi.returnAsset(id, {
        returnedAtUtc: new Date().toISOString(),
        notes: "Zwrot z widoku szczegółów maszyny.",
      });

      await loadData();
    } catch (err) {
      setError(toApiError(err, "Nie udało się zwrócić maszyny."));
    } finally {
      setAssigningEmployee(false);
    }
  };

  const activeIncidents = useMemo(
    () =>
      incidents
        .filter(
          (incident) =>
            incident.status !== FailureStatus.Resolved &&
            incident.status !== FailureStatus.Closed,
        )
        .sort(
          (left, right) =>
            Date.parse(right.reportedAtUtc) - Date.parse(left.reportedAtUtc),
        ),
    [incidents],
  );

  const activeWorkOrders = useMemo(
    () =>
      workOrders
        .filter(
          (workOrder) =>
            workOrder.status !== WorkOrderStatus.Done &&
            workOrder.status !== WorkOrderStatus.Cancelled,
        )
        .sort(
          (left, right) =>
            Date.parse(right.requestedAtUtc) - Date.parse(left.requestedAtUtc),
        ),
    [workOrders],
  );

  const sortedMaintenancePlans = useMemo(
    () =>
      [...maintenancePlans].sort((left, right) => {
        const leftValue =
          left.triggerMode === MaintenanceTriggerMode.Calendar
            ? Date.parse(left.nextDueAtUtc ?? left.startsAtUtc)
            : (left.nextDueMeterValue ?? Number.MAX_SAFE_INTEGER);

        const rightValue =
          right.triggerMode === MaintenanceTriggerMode.Calendar
            ? Date.parse(right.nextDueAtUtc ?? right.startsAtUtc)
            : (right.nextDueMeterValue ?? Number.MAX_SAFE_INTEGER);

        return leftValue - rightValue;
      }),
    [maintenancePlans],
  );

  const nextMaintenancePlan = sortedMaintenancePlans.find(
    (plan) => plan.isActive,
  );

  const recentUsageReadings = [...(machine?.usageReadings ?? [])]
    .sort(
      (left, right) =>
        Date.parse(right.recordedAtUtc) - Date.parse(left.recordedAtUtc),
    )
    .slice(0, 6);

  const currentAssignment = [...(machine?.assignments ?? [])]
    .sort(
      (left, right) =>
        Date.parse(right.assignedAtUtc) - Date.parse(left.assignedAtUtc),
    )
    .find((assignment) => assignment.status === AssetAssignmentStatus.Active);

  const currentPlacement = [...(machine?.placements ?? [])]
    .filter((placement) => placement.isCurrent)
    .sort(
      (left, right) =>
        Date.parse(right.placedAtUtc) - Date.parse(left.placedAtUtc),
    )[0];

  const machineId = machine?.id ?? "";

  const categoryEmployees = employees.filter(
    (employee) => !!findRelevantSkill(employee, machineId, selectedCategoryId),
  );

  const maintainers = categoryEmployees.filter(
    (employee) =>
      !!findRelevantSkill(employee, machineId, selectedCategoryId)?.canMaintain,
  );

  const operators = categoryEmployees.filter(
    (employee) =>
      !!findRelevantSkill(employee, machineId, selectedCategoryId)?.canOperate,
  );

  const approvers = categoryEmployees.filter(
    (employee) =>
      !!findRelevantSkill(employee, machineId, selectedCategoryId)
        ?.canApproveMaintenance,
  );

  if (loading && !machine) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300 shadow-xl shadow-slate-950/25">
        Ładowanie szczegółów maszyny...
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] p-6 text-sm text-rose-100">
        {error?.message ?? "Nie znaleziono maszyny."}
      </div>
    );
  }

  return (
    <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  Szczegóły maszyny
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Kod: {trimmedCode || "uzupełnij"}
                </span>

                <OperationalStatusBadge
                  label={
                    statusOptions.find((option) => option.value === status)
                      ?.label ?? "Status"
                  }
                  tone={assetStatusTone(status)}
                />

                <OperationalStatusBadge
                  label={
                    selectedCategory?.name ??
                    machine.category ??
                    "Bez kategorii"
                  }
                  tone="neutral"
                />
              </div>

              <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                {trimmedName || "Nowa nazwa maszyny"}
              </h1>

              <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                {normalizedDescription ||
                  "Brak opisu maszyny. Uzupełnij opis, żeby łatwiej rozpoznać zastosowanie, lokalizację lub ograniczenia zasobu."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:max-w-[42rem] xl:justify-end">
              <Link
                to="/machines"
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Lista maszyn
              </Link>

              <Link
                to={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
                className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
              >
                Przeglądy
              </Link>

              <Link
                to={`/activity?assetId=${encodeURIComponent(machine.id)}`}
                className="rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-400/45 hover:bg-amber-400/[0.12]"
              >
                Do zrobienia dziś
              </Link>

              <Link
                to={`/lean?create=1&title=${encodeURIComponent(
                  `Kaizen dla maszyny ${machine.name}`,
                )}&description=${encodeURIComponent(
                  `Usprawnienie dla maszyny ${machine.name} (${machine.code}) w obszarze niezawodności, przeglądów lub przezbrojeń.`,
                )}`}
                className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
              >
                Dodaj Kaizen
              </Link>

              <Link
                to={`/inventory?assetId=${encodeURIComponent(machine.id)}`}
                className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Magazyn
              </Link>

              <button
                type="button"
                onClick={() => setOpenAssignmentModal(true)}
                className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
              >
                {currentAssignment
                  ? "Zmien przypisanie"
                  : "Przypisz pracownika"}
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              label="Otwarte awarie"
              value={String(activeIncidents.length)}
              hint={activeIncidents[0]?.title ?? "Brak aktywnych awarii"}
              tone={activeIncidents.length > 0 ? "rose" : "slate"}
            />

            <SummaryTile
              label="Aktywne zlecenia"
              value={String(activeWorkOrders.length)}
              hint={activeWorkOrders[0]?.title ?? "Brak aktywnych zleceń"}
              tone={activeWorkOrders.length > 0 ? "amber" : "slate"}
            />

            <SummaryTile
              label="Najbliższy przegląd"
              value={
                nextMaintenancePlan
                  ? maintenanceStatusLabels[nextMaintenancePlan.currentStatus]
                  : "-"
              }
              hint={
                nextMaintenancePlan
                  ? nextDueLabel(nextMaintenancePlan)
                  : "Brak planu"
              }
              tone={
                nextMaintenancePlan?.currentStatus ===
                MaintenanceOccurrenceStatus.Overdue
                  ? "rose"
                  : nextMaintenancePlan?.currentStatus ===
                      MaintenanceOccurrenceStatus.DueSoon
                    ? "amber"
                    : "cyan"
              }
            />

            <SummaryTile
              label="Uprawnienia UR"
              value={String(maintainers.length)}
              hint={`Operatorzy: ${operators.length}, akceptacja: ${approvers.length}`}
              tone="emerald"
            />
          </div>
        </section>

        {error ? (
          <div className="shrink-0 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-2 text-sm text-amber-100">
            {error.message}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl shadow-slate-950/25">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Karta techniczna
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Najważniejsze informacje do szybkiego przeglądu i
                    prezentacji.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/maintenance?assetId=${encodeURIComponent(machine.id)}&create=1`}
                    className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                  >
                    Dodaj plan przeglądu
                  </Link>

                  <Link
                    to="/work-orders"
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Zlecenia
                  </Link>

                  <Link
                    to="/incidents"
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Awarie
                  </Link>

                  <Link
                    to="/machine-categories"
                    className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Kategorie
                  </Link>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <DetailGridItem
                  label="Model"
                  value={normalizedModel ?? "—"}
                  tone="cyan"
                />
                <DetailGridItem
                  label="Producent"
                  value={normalizedManufacturer ?? "—"}
                />
                <DetailGridItem
                  label="Numer seryjny"
                  value={normalizedSerialNumber ?? "—"}
                />
                <DetailGridItem
                  label="Kod ewidencyjny"
                  value={trimmedCode || "—"}
                  tone="violet"
                />

                <DetailGridItem
                  label="Szerokość podstawy"
                  value={formatDimensionPreview(footprintWidthMeters)}
                />

                <DetailGridItem
                  label="Długość podstawy"
                  value={formatDimensionPreview(footprintLengthMeters)}
                />

                <DetailGridItem
                  label="Mobilna"
                  value={machine.isMobile ? "Tak" : "Nie"}
                  tone={machine.isMobile ? "cyan" : "slate"}
                />
              </div>

              <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Opis maszyny
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {normalizedDescription ??
                      "Dodaj zwięzły opis zastosowania, ograniczeń albo miejsca pracy maszyny, aby ekran był bardziej czytelny dla odbiorcy."}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Kontekst operacyjny
                  </div>

                  <div className="mt-3 space-y-2">
                    <SmallInfo
                      label="Przypisanie"
                      value={
                        currentAssignment
                          ? employeeName(
                              employeeById.get(currentAssignment.employeeId),
                            )
                          : "Brak aktywnego przypisania"
                      }
                    />

                    <SmallInfo
                      label="Layout"
                      value={
                        currentPlacement
                          ? `Hala ${currentPlacement.hallId.slice(0, 8)}`
                          : "Brak rozmieszczenia"
                      }
                    />

                    <SmallInfo
                      label="Ostatnia aktualizacja"
                      value={formatDateTime(machine.updatedAtUtc)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-1">
                  <PanelTab
                    active={panelMode === "operations"}
                    onClick={() => setPanelMode("operations")}
                  >
                    Operacyjne
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "meters"}
                    onClick={() => setPanelMode("meters")}
                  >
                    Liczniki
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "parameters"}
                    onClick={() => setPanelMode("parameters")}
                  >
                    Parametry
                  </PanelTab>

                  <PanelTab
                    active={panelMode === "competences"}
                    onClick={() => setPanelMode("competences")}
                  >
                    Uprawnienia
                  </PanelTab>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {panelMode === "operations" ? (
                  <OperationsPanel
                    machine={machine}
                    sortedMaintenancePlans={sortedMaintenancePlans}
                    activeIncidents={activeIncidents}
                    activeWorkOrders={activeWorkOrders}
                  />
                ) : null}

                {panelMode === "meters" ? (
                  <MetersPanel
                    machine={machine}
                    usageMeterType={usageMeterType}
                    usageReadingValue={usageReadingValue}
                    usageNotes={usageNotes}
                    savingUsage={savingUsage}
                    recentUsageReadings={recentUsageReadings}
                    onMeterTypeChange={setUsageMeterType}
                    onReadingValueChange={setUsageReadingValue}
                    onNotesChange={setUsageNotes}
                    onSaveReading={handleAddUsageReading}
                  />
                ) : null}

                {panelMode === "parameters" ? (
                  <div className="h-full overflow-auto p-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                      <MachineParameterFormFields
                        parameters={parameterDefinitions}
                        values={parameterValues}
                        onChange={(parameterId, value) =>
                          setParameterValues((current) => ({
                            ...current,
                            [parameterId]: value,
                          }))
                        }
                        disabled={saving}
                        emptyText="Ta maszyna nie ma jeszcze przypisanej kategorii z parametrami."
                      />
                    </div>
                  </div>
                ) : null}

                {panelMode === "competences" ? (
                  <CompetencesPanel
                    machineId={machine.id}
                    selectedCategoryId={selectedCategoryId}
                    maintainers={maintainers}
                    operators={operators}
                    approvers={approvers}
                  />
                ) : null}
              </div>
            </section>
          </div>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                Edycja i konfiguracja
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Zmień dane identyfikacyjne, status i ustawienia prezentowane na
                ekranie.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto py-3">
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Dane podstawowe
                  </div>

                  <div className="grid gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Nazwa maszyny
                      </span>

                      <input
                        value={editor.name}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                        placeholder="np. TRUMPF TruLaser 3030"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Kod maszyny
                      </span>

                      <input
                        value={editor.code}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            code: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                        placeholder="np. MCH-LAS-01"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Opis
                      </span>

                      <textarea
                        value={editor.description}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                        placeholder="Krótko opisz przeznaczenie maszyny, kluczowe ograniczenia lub obszar pracy."
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Specyfikacja
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Producent
                      </span>

                      <input
                        value={editor.manufacturer}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            manufacturer: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                        placeholder="np. TRUMPF"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Model
                      </span>

                      <input
                        value={editor.model}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            model: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                        placeholder="np. TruLaser 3030"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Numer seryjny
                      </span>

                      <input
                        value={editor.serialNumber}
                        onChange={(event) =>
                          setEditor((current) => ({
                            ...current,
                            serialNumber: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                        placeholder="np. TR-3030-2024-017"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Status i klasyfikacja
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Status maszyny
                    </span>

                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(Number(event.target.value) as AssetStatus)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-3 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Kategoria
                    </span>

                    <select
                      value={selectedCategoryId}
                      onChange={(event) =>
                        handleCategoryChange(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                    >
                      <option value="">Bez kategorii</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Szerokość [m]
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={footprintWidthMeters}
                        onChange={(event) =>
                          setFootprintWidthMeters(event.target.value)
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                        placeholder="np. 2.40"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                        Długość [m]
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={footprintLengthMeters}
                        onChange={(event) =>
                          setFootprintLengthMeters(event.target.value)
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                        placeholder="np. 5.80"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Notatki
                  </div>

                  <textarea
                    value={editor.notes}
                    onChange={(event) =>
                      setEditor((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    rows={4}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                    placeholder="Dodatkowe informacje eksploatacyjne, przygotowanie pod audyt lub uwagi do prezentacji."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!canSave}
                  className="w-full rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:border-slate-700 disabled:bg-slate-950 disabled:text-slate-500 disabled:opacity-80"
                >
                  {saving ? "Zapisywanie..." : "Zapisz zmiany"}
                </button>

                {missingRequiredParameter ? (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-3 py-2 text-xs text-amber-100">
                    Uzupełnij parametr wymagany: {missingRequiredParameter.name}
                    .
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Aktualne przypisanie
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-100">
                    {currentAssignment
                      ? employeeName(
                          employeeById.get(currentAssignment.employeeId),
                        )
                      : "Brak wydań maszyny"}
                  </div>

                  {currentAssignment ? (
                    <>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatDateTime(currentAssignment.assignedAtUtc)}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenAssignmentModal(true)}
                          className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                        >
                          Zmien
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleReturnAssignment()}
                          disabled={assigningEmployee}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:opacity-60"
                        >
                          Zwroc maszyne
                        </button>
                      </div>
                    </>
                  ) : null}

                  {!currentAssignment ? (
                    <button
                      type="button"
                      onClick={() => setOpenAssignmentModal(true)}
                      className="mt-3 rounded-lg border border-emerald-400/35 bg-emerald-400/[0.12] px-2.5 py-1.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                    >
                      Przypisz pracownika
                    </button>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Pozycja na layoutcie
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-100">
                    {currentPlacement
                      ? `Hala ${currentPlacement.hallId.slice(0, 8)} • sekcja ${
                          currentPlacement.sectionId?.slice(0, 8) ?? "brak"
                        }`
                      : "Brak aktywnego rozmieszczenia"}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <DetailGridItem
                    label="Awarii łącznie"
                    value={String(machine.failureReportsCount)}
                    tone={machine.failureReportsCount > 0 ? "rose" : "slate"}
                  />

                  <DetailGridItem
                    label="Zleceń łącznie"
                    value={String(machine.workOrdersCount)}
                    tone={machine.workOrdersCount > 0 ? "amber" : "slate"}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/inventory?assetId=${encodeURIComponent(machine.id)}`}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Części
                  </Link>

                  <Link
                    to="/employees"
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Uprawnienia
                  </Link>

                  <button
                    type="button"
                    onClick={() => setPanelMode("competences")}
                    className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                  >
                    Pokaz uprawnienia
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <MachineAssignmentModal
        open={openAssignmentModal}
        machine={machine}
        employees={employees}
        currentAssignmentEmployeeId={currentAssignment?.employeeId ?? null}
        saving={assigningEmployee}
        onClose={() => setOpenAssignmentModal(false)}
        onSubmit={handleAssignEmployee}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: PanelTone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-65">
        {label}
      </div>

      <div className="mt-2 truncate text-2xl font-bold leading-none">
        {value}
      </div>

      <div className="mt-2 line-clamp-1 text-xs opacity-70">{hint}</div>
    </div>
  );
}

function MachineAssignmentModal({
  open,
  machine,
  employees,
  currentAssignmentEmployeeId,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  machine: AssetDetailsDto;
  employees: EmployeeDto[];
  currentAssignmentEmployeeId?: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (
    employeeId: string,
    dueBackAtUtc?: string | null,
    notes?: string | null,
  ) => Promise<void>;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [dueBackAtUtc, setDueBackAtUtc] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;

    setSelectedEmployeeId(currentAssignmentEmployeeId ?? "");
    setDueBackAtUtc("");
    setNotes("");
    setSearch("");
  }, [currentAssignmentEmployeeId, open]);

  const filteredEmployees = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return employees.filter((employee) => {
      if (employee.status !== EmployeeStatus.Active) return false;
      if (!normalized) return true;

      return [
        employee.firstName,
        employee.lastName,
        employee.employeeNumber,
        employee.jobTitle ?? "",
        employee.departmentName ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [employees, search]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/60">
        <div className="border-b border-slate-800 px-6 py-5">
          <div className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
            Przypisanie maszyny
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-white">
            {machine.name}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Wybierz pracownika, do ktorego maszyna ma byc aktualnie przypisana.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Szukaj pracownika
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
              placeholder="Nazwisko, numer, dzial..."
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Pracownik
            </span>
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
            >
              <option value="">Wybierz pracownika</option>
              {filteredEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} /{" "}
                  {employee.employeeNumber}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Termin zwrotu
              </span>
              <input
                type="datetime-local"
                value={dueBackAtUtc}
                onChange={(event) => setDueBackAtUtc(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Notatka
              </span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                placeholder="np. operator zmiany A"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={() =>
                void onSubmit(
                  selectedEmployeeId,
                  dueBackAtUtc || null,
                  notes || null,
                )
              }
              disabled={!selectedEmployeeId || saving}
              className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-4 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:border-slate-700 disabled:bg-slate-950 disabled:text-slate-500 disabled:opacity-80"
            >
              {saving ? "Zapisywanie..." : "Przypisz maszyne"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailGridItem({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: PanelTone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>

      <div className="mt-2 line-clamp-1 text-sm font-semibold">{value}</div>
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
        "rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] transition",
        active
          ? "border-cyan-400/35 bg-cyan-400/[0.10] text-cyan-100"
          : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function OperationsPanel({
  machine,
  sortedMaintenancePlans,
  activeIncidents,
  activeWorkOrders,
}: {
  machine: AssetDetailsDto;
  sortedMaintenancePlans: MaintenancePlanDto[];
  activeIncidents: FailureReportDto[];
  activeWorkOrders: WorkOrderDto[];
}) {
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-hidden p-3 xl:grid-cols-3">
      <OperationalListSection
        title="Najbliższe przeglądy"
        linkLabel="Harmonogram"
        linkTo={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
      >
        <div className="max-h-full space-y-2 overflow-auto pr-1">
          {sortedMaintenancePlans.slice(0, 6).map((plan) => (
            <OperationItem
              key={plan.id}
              title={plan.title}
              subtitle={nextDueLabel(plan)}
              badge={
                <OperationalStatusBadge
                  label={maintenanceStatusLabels[plan.currentStatus]}
                  tone={maintenanceTone(plan.currentStatus)}
                />
              }
              linkTo={`/maintenance?assetId=${encodeURIComponent(
                machine.id,
              )}&planId=${encodeURIComponent(plan.id)}`}
            />
          ))}

          {sortedMaintenancePlans.length === 0 ? (
            <EmptyBox text="Brak planów przeglądów dla tej maszyny." />
          ) : null}
        </div>
      </OperationalListSection>

      <OperationalListSection
        title="Otwarte awarie"
        linkLabel="Lista"
        linkTo="/incidents"
      >
        <div className="max-h-full space-y-2 overflow-auto pr-1">
          {activeIncidents.slice(0, 6).map((incident) => (
            <OperationItem
              key={incident.id}
              title={incident.title}
              subtitle={`Zgłoszono: ${formatDateTime(incident.reportedAtUtc)}`}
              badge={
                <OperationalStatusBadge
                  label={severityLabels[incident.severity]}
                  tone={severityTone(incident.severity)}
                />
              }
              linkTo={`/incidents/${incident.id}`}
            />
          ))}

          {activeIncidents.length === 0 ? (
            <EmptyBox text="Brak aktywnych awarii." />
          ) : null}
        </div>
      </OperationalListSection>

      <OperationalListSection
        title="Aktywne zlecenia"
        linkLabel="Zlecenia"
        linkTo="/work-orders"
      >
        <div className="max-h-full space-y-2 overflow-auto pr-1">
          {activeWorkOrders.slice(0, 6).map((workOrder) => (
            <OperationItem
              key={workOrder.id}
              title={workOrder.title}
              subtitle={`${workOrder.number} • ${workOrderSourceLabels[workOrder.source]}`}
              badge={
                <OperationalStatusBadge
                  label={workOrderStatusLabels[workOrder.status]}
                  tone={workOrderTone(workOrder.status)}
                />
              }
              linkTo={`/work-orders/${workOrder.id}`}
            />
          ))}

          {activeWorkOrders.length === 0 ? (
            <EmptyBox text="Brak aktywnych zleceń serwisowych." />
          ) : null}
        </div>
      </OperationalListSection>
    </div>
  );
}

function MetersPanel({
  machine,
  usageMeterType,
  usageReadingValue,
  usageNotes,
  savingUsage,
  recentUsageReadings,
  onMeterTypeChange,
  onReadingValueChange,
  onNotesChange,
  onSaveReading,
}: {
  machine: AssetDetailsDto;
  usageMeterType: AssetMeterType;
  usageReadingValue: string;
  usageNotes: string;
  savingUsage: boolean;
  recentUsageReadings: AssetDetailsDto["usageReadings"];
  onMeterTypeChange: (value: AssetMeterType) => void;
  onReadingValueChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSaveReading: () => Promise<void>;
}) {
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-hidden p-3 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
        <div className="grid shrink-0 gap-3 md:grid-cols-3">
          {machine.usageSummaries.length > 0 ? (
            machine.usageSummaries.map((summary) => (
              <div
                key={summary.meterType}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="line-clamp-1 text-sm font-semibold text-white">
                  {meterLabels[summary.meterType]}
                </div>

                <div className="mt-2 text-2xl font-bold text-slate-100">
                  {summary.latestReadingValue ?? "-"}
                </div>

                <div className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {formatDateTime(summary.latestRecordedAtUtc)}
                </div>

                <div className="mt-3 grid gap-2">
                  <SmallInfo
                    label="Następny próg"
                    value={String(summary.nextMaintenanceMeterValue ?? "-")}
                  />

                  <SmallInfo
                    label="Pozostało"
                    value={String(summary.remainingToNextMaintenance ?? "-")}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-6 text-sm text-slate-500 md:col-span-3">
              Brak odczytów liczników.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="text-sm font-bold text-white">Dodaj odczyt</div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Typ licznika</span>

              <select
                value={usageMeterType}
                onChange={(event) =>
                  onMeterTypeChange(
                    Number(event.target.value) as AssetMeterType,
                  )
                }
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
              >
                {Object.values(AssetMeterType).map((value) =>
                  typeof value === "number" ? (
                    <option key={value} value={value}>
                      {meterLabels[value as AssetMeterType]}
                    </option>
                  ) : null,
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Wartość</span>

              <input
                type="number"
                min="0"
                step="0.01"
                value={usageReadingValue}
                onChange={(event) => onReadingValueChange(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                placeholder="np. 1250"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-400">Notatka</span>

              <input
                value={usageNotes}
                onChange={(event) => onNotesChange(event.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                placeholder="np. po zmianie nocnej"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => void onSaveReading()}
            disabled={!usageReadingValue.trim() || savingUsage}
            className="mt-3 rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-4 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:border-slate-700 disabled:bg-slate-950 disabled:text-slate-500 disabled:opacity-80"
          >
            {savingUsage ? "Zapisywanie..." : "Zapisz odczyt"}
          </button>
        </div>
      </div>

      <div className="min-h-0 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="text-sm font-bold text-white">Historia odczytów</div>

        <div className="mt-3 space-y-2">
          {recentUsageReadings.length > 0 ? (
            recentUsageReadings.map((reading) => (
              <div
                key={reading.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm"
              >
                <div className="font-semibold text-white">
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
            <EmptyBox text="Brak odczytów liczników." />
          )}
        </div>
      </div>
    </div>
  );
}

function CompetencesPanel({
  machineId,
  selectedCategoryId,
  maintainers,
  operators,
  approvers,
}: {
  machineId: string;
  selectedCategoryId: string;
  maintainers: EmployeeDto[];
  operators: EmployeeDto[];
  approvers: EmployeeDto[];
}) {
  return (
    <div className="grid h-full min-h-0 gap-3 overflow-hidden p-3 xl:grid-cols-3">
      <div className="min-h-0 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Utrzymanie ruchu
        </div>

        <EmployeeList
          employees={maintainers}
          machineId={machineId}
          categoryId={selectedCategoryId}
          emptyText="Brak pracowników UR dla tej kategorii."
        />
      </div>

      <div className="min-h-0 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Operatorzy
        </div>

        <EmployeeList
          employees={operators}
          machineId={machineId}
          categoryId={selectedCategoryId}
          emptyText="Brak operatorów dla tej kategorii."
        />
      </div>

      <div className="min-h-0 overflow-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Akceptacja przeglądów
        </div>

        <EmployeeList
          employees={approvers}
          machineId={machineId}
          categoryId={selectedCategoryId}
          emptyText="Brak osób zatwierdzających przeglądy."
        />
      </div>
    </div>
  );
}

function EmployeeList({
  employees,
  machineId,
  categoryId,
  emptyText,
}: {
  employees: EmployeeDto[];
  machineId: string;
  categoryId: string;
  emptyText: string;
}) {
  if (employees.length === 0) {
    return <EmptyBox text={emptyText} />;
  }

  return (
    <div className="space-y-2">
      {employees.map((employee) => {
        const matchedSkill = findRelevantSkill(employee, machineId, categoryId);

        return (
          <div
            key={employee.id}
            className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-3 py-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">
                {employee.firstName} {employee.lastName}
              </div>

              <div className="mt-1 truncate text-xs text-slate-500">
                {employee.jobTitle ?? "Brak stanowiska"}
              </div>

              {matchedSkill ? (
                <div className="mt-2 inline-flex rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-400">
                  {matchedSkill.isMachineSpecific
                    ? "Uprawnienie dla maszyny"
                    : "Uprawnienie dla kategorii"}
                </div>
              ) : null}
            </div>

            <div className="max-w-[45%] text-right text-xs text-slate-400">
              {employeeCapabilityLabel(employee, machineId, categoryId)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OperationItem({
  title,
  subtitle,
  badge,
  linkTo,
}: {
  title: string;
  subtitle: string;
  badge: ReactNode;
  linkTo: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-semibold text-white">
            {title}
          </div>

          <div className="mt-1 line-clamp-1 text-xs text-slate-500">
            {subtitle}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {badge}

          <Link
            to={linkTo}
            className="text-xs font-semibold text-cyan-100 hover:underline"
          >
            Szczegóły
          </Link>
        </div>
      </div>
    </div>
  );
}

function OperationalListSection({
  title,
  linkLabel,
  linkTo,
  children,
}: {
  title: string;
  linkLabel: string;
  linkTo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </div>

        <Link
          to={linkTo}
          className="text-xs font-semibold text-cyan-100 hover:underline"
        >
          {linkLabel}
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
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

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-3 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}
