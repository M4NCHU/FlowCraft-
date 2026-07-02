import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { assetCategoriesApi } from "../../machines/api/assetCategoriesApi";
import { assetsApi } from "../../machines/api/assetsApi";
import {
  AssetType,
  type AssetCategoryDto,
  type AssetListItemDto,
} from "../../machines/api/contracts";
import { employeesApi } from "../api/employeesApi";
import {
  EmployeeSkillLevel,
  EmployeeStatus,
  type EmployeeDto,
  type UpsertEmployeeSkillRequest,
} from "../api/contracts";
import { AddEmployeeModal } from "./components/AddEmployeeModal";
import { EmployeeSkillsModal } from "./components/EmployeeSkillsModal";

const statusLabels: Record<EmployeeStatus, string> = {
  [EmployeeStatus.Active]: "Aktywny",
  [EmployeeStatus.OnLeave]: "Nieobecny",
  [EmployeeStatus.Suspended]: "Zawieszony",
  [EmployeeStatus.Terminated]: "Zakończono współpracę",
};

const skillLevelLabels: Record<EmployeeSkillLevel, string> = {
  [EmployeeSkillLevel.Beginner]: "Początkujący",
  [EmployeeSkillLevel.Independent]: "Samodzielny",
  [EmployeeSkillLevel.Advanced]: "Zaawansowany",
  [EmployeeSkillLevel.Trainer]: "Trener",
};

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

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

function getStatusTone(status: EmployeeStatus): Tone {
  switch (status) {
    case EmployeeStatus.Active:
      return "emerald";
    case EmployeeStatus.OnLeave:
      return "amber";
    case EmployeeStatus.Suspended:
      return "rose";
    case EmployeeStatus.Terminated:
      return "slate";
    default:
      return "slate";
  }
}

function getSkillLevelTone(level: EmployeeSkillLevel): Tone {
  switch (level) {
    case EmployeeSkillLevel.Beginner:
      return "slate";
    case EmployeeSkillLevel.Independent:
      return "cyan";
    case EmployeeSkillLevel.Advanced:
      return "emerald";
    case EmployeeSkillLevel.Trainer:
      return "violet";
    default:
      return "slate";
  }
}

function permissionScopeLabels(skill: {
  canOperate: boolean;
  canMaintain: boolean;
  canApproveMaintenance: boolean;
}) {
  return [
    skill.canOperate ? "Obsluga" : null,
    skill.canMaintain ? "UR" : null,
    skill.canApproveMaintenance ? "Akceptacja" : null,
  ].filter(Boolean);
}

function permissionScopeSummary(skill: {
  canOperate: boolean;
  canMaintain: boolean;
  canApproveMaintenance: boolean;
}) {
  const labels = permissionScopeLabels(skill);
  return labels.length > 0 ? labels.join(" / ") : "Brak zakresu";
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [assets, setAssets] = useState<AssetListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [skillsEmployeeId, setSkillsEmployeeId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "">("");
  const [skillFilter, setSkillFilter] = useState<
    "all" | "withSkills" | "withoutSkills" | "maintainers" | "approvers"
  >("all");

  const loadEmployees = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      employeesApi.list({ signal }),
      assetCategoriesApi.list({
        assetType: AssetType.Machine,
        includeInactive: false,
        signal,
      }),
      assetsApi.list({ includeInactive: false, signal }),
    ]);

    if (signal?.aborted) return;

    const [employeesResult, categoriesResult, assetsResult] = results;
    const firstRejected = results.find(
      (result) => result.status === "rejected",
    );

    const nextEmployees =
      employeesResult.status === "fulfilled"
        ? (employeesResult.value ?? [])
        : [];

    setEmployees(nextEmployees);
    setCategories(
      categoriesResult.status === "fulfilled"
        ? (categoriesResult.value ?? [])
        : [],
    );
    setAssets(
      assetsResult.status === "fulfilled"
        ? (assetsResult.value ?? []).filter(
            (asset) => asset.type === AssetType.Machine,
          )
        : [],
    );
    setSelectedEmployeeId((current) => current ?? nextEmployees[0]?.id ?? null);
    setLoading(false);
    setError(
      firstRejected
        ? toApiError(firstRejected.reason, "Nie udało się pobrać pracowników.")
        : null,
    );
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadEmployees(controller.signal);

    return () => controller.abort();
  }, []);

  const handleCreated = (employee: EmployeeDto) => {
    setEmployees((prev) => [employee, ...prev]);
    setSelectedEmployeeId(employee.id);
  };

  const selectedEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const skillsEmployee = useMemo(
    () =>
      employees.find((employee) => employee.id === skillsEmployeeId) ?? null,
    [employees, skillsEmployeeId],
  );

  const handleSkillsSaved = (
    employeeId: string,
    skills: UpsertEmployeeSkillRequest[],
  ) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              skills: skills.map((skill, index) => {
                const category = categories.find(
                  (entry) => entry.id === skill.assetCategoryId,
                );

                return {
                  id: `${employeeId}-${skill.assetCategoryId}-${index}`,
                  assetCategoryId: skill.assetCategoryId,
                  assetCategoryName: category?.name ?? "",
                  assetType: category?.assetType ?? 0,
                  skillLevel: skill.skillLevel,
                  canOperate: skill.canOperate,
                  canMaintain: skill.canMaintain,
                  canApproveMaintenance: skill.canApproveMaintenance,
                  notes: skill.notes ?? null,
                  assetId: skill.assetId ?? null,
                  assetName:
                    skill.assetId != null
                      ? (assets.find((asset) => asset.id === skill.assetId)
                          ?.name ?? null)
                      : null,
                  isMachineSpecific: !!skill.assetId,
                  scopeLabel:
                    skill.assetId != null
                      ? (assets.find((asset) => asset.id === skill.assetId)
                          ?.name ??
                        category?.name ??
                        "")
                      : (category?.name ?? ""),
                  createdAtUtc: new Date().toISOString(),
                  updatedAtUtc: new Date().toISOString(),
                };
              }),
            }
          : employee,
      ),
    );
  };

  const activeEmployeesCount = useMemo(
    () =>
      employees.filter((employee) => employee.status === EmployeeStatus.Active)
        .length,
    [employees],
  );

  const employeesWithSkillsCount = useMemo(
    () => employees.filter((employee) => employee.skills.length > 0).length,
    [employees],
  );

  const operatorsCount = useMemo(
    () =>
      employees.filter((employee) =>
        employee.skills.some((skill) => skill.canOperate),
      ).length,
    [employees],
  );

  const maintainersCount = useMemo(
    () =>
      employees.filter((employee) =>
        employee.skills.some((skill) => skill.canMaintain),
      ).length,
    [employees],
  );

  const approversCount = useMemo(
    () =>
      employees.filter((employee) =>
        employee.skills.some((skill) => skill.canApproveMaintenance),
      ).length,
    [employees],
  );

  const capabilityCoverage = useMemo(() => {
    if (employees.length === 0) return 0;

    return Math.round((employeesWithSkillsCount / employees.length) * 100);
  }, [employees.length, employeesWithSkillsCount]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employees.filter((employee) => {
      if (statusFilter !== "" && employee.status !== statusFilter) {
        return false;
      }

      if (skillFilter === "withSkills" && employee.skills.length === 0) {
        return false;
      }

      if (skillFilter === "withoutSkills" && employee.skills.length > 0) {
        return false;
      }

      if (
        skillFilter === "maintainers" &&
        !employee.skills.some((skill) => skill.canMaintain)
      ) {
        return false;
      }

      if (
        skillFilter === "approvers" &&
        !employee.skills.some((skill) => skill.canApproveMaintenance)
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        employee.firstName,
        employee.lastName,
        employee.employeeNumber,
        employee.jobTitle ?? "",
        employee.departmentName ?? "",
        employee.phone ?? "",
        ...employee.skills.map((skill) => permissionScopeSummary(skill)),
        ...employee.skills.map((skill) => skill.scopeLabel),
        ...employee.skills.map((skill) => skill.assetName ?? ""),
        ...employee.skills.map((skill) => skill.assetCategoryName),
        ...employee.assignedAssets.map((asset) => asset.assetName),
        ...employee.assignedAssets.map((asset) => asset.assetCode),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [employees, search, skillFilter, statusFilter]);

  useEffect(() => {
    if (!selectedEmployeeId && filteredEmployees[0]?.id) {
      setSelectedEmployeeId(filteredEmployees[0].id);
      return;
    }

    if (
      selectedEmployeeId &&
      filteredEmployees.length > 0 &&
      !filteredEmployees.some((employee) => employee.id === selectedEmployeeId)
    ) {
      setSelectedEmployeeId(filteredEmployees[0].id);
    }
  }, [filteredEmployees, selectedEmployeeId]);

  return (
    <>
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Zespół
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {activeEmployeesCount} aktywnych
                  </span>

                  {employees.length > 0 && capabilityCoverage < 70 ? (
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      Niskie pokrycie uprawnien
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Pracownicy i uprawnienia
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Lista pracownikow polaczona z uprawnieniami maszynowymi. To
                  tutaj sprawdzisz, kto moze obslugiwac, serwisowac lub
                  akceptowac przeglady dla danej kategorii maszyny.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link
                  to="/departments"
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Działy
                </Link>

                <button
                  type="button"
                  onClick={() => void loadEmployees()}
                  className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                >
                  Odśwież
                </button>

                <button
                  type="button"
                  onClick={() => setOpenAdd(true)}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Dodaj pracownika
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                label="Aktywni"
                value={String(activeEmployeesCount)}
                hint="Dostepni operacyjnie"
                tone="emerald"
              />

              <SummaryCard
                label="Pokrycie uprawnien"
                value={`${capabilityCoverage}%`}
                hint={`${employeesWithSkillsCount} z ${employees.length} pracownikow`}
                tone={capabilityCoverage >= 70 ? "cyan" : "amber"}
              />

              <SummaryCard
                label="Operatorzy"
                value={String(operatorsCount)}
                hint="Maja obsluge"
                tone="violet"
              />

              <SummaryCard
                label="UR"
                value={String(maintainersCount)}
                hint="Moze serwisowac"
                tone="cyan"
              />

              <SummaryCard
                label="Akceptacje"
                value={String(approversCount)}
                hint="Zatwierdza przeglady"
                tone="slate"
              />
            </div>
          </section>

          {error ? (
            <div className="shrink-0 rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-2 text-sm text-rose-100">
              {error.message}
            </div>
          ) : null}

          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                      Lista pracowników
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Kliknij pracownika, zeby zobaczyc szczegoly i uprawnienia
                      po prawej.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenAdd(true)}
                    className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                  >
                    Dodaj pracownika
                  </button>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Szukaj po nazwisku, numerze, dziale lub uprawnieniu..."
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
                  />

                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value === ""
                          ? ""
                          : (Number(event.target.value) as EmployeeStatus),
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                  >
                    <option value="">Wszystkie statusy</option>
                    {Object.values(EmployeeStatus).map((value) =>
                      typeof value === "number" ? (
                        <option key={value} value={value}>
                          {statusLabels[value as EmployeeStatus]}
                        </option>
                      ) : null,
                    )}
                  </select>

                  <select
                    value={skillFilter}
                    onChange={(event) =>
                      setSkillFilter(
                        event.target.value as
                          | "all"
                          | "withSkills"
                          | "withoutSkills"
                          | "maintainers"
                          | "approvers",
                      )
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
                  >
                    <option value="all">Wszystkie uprawnienia</option>
                    <option value="withSkills">Z uprawnieniami</option>
                    <option value="withoutSkills">Bez uprawnien</option>
                    <option value="maintainers">Utrzymanie ruchu</option>
                    <option value="approvers">Akceptacja przegladow</option>
                  </select>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    Ładowanie pracowników...
                  </div>
                ) : null}

                {!loading && employees.length === 0 ? (
                  <EmptyState text="Brak pracownikow. Dodaj pierwsza osobe, aby zbudowac liste uprawnien." />
                ) : null}

                {!loading && employees.length > 0 ? (
                  <div className="space-y-2">
                    {filteredEmployees.map((employee) => (
                      <EmployeeRow
                        key={employee.id}
                        employee={employee}
                        selected={employee.id === selectedEmployeeId}
                        onSelect={() => setSelectedEmployeeId(employee.id)}
                        onEditSkills={() => setSkillsEmployeeId(employee.id)}
                      />
                    ))}

                    {filteredEmployees.length === 0 ? (
                      <EmptyState text="Brak pracowników pasujących do aktualnych filtrów." />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
              <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                  Profil pracownika
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Dane kontaktowe, status i uprawnienia maszynowe.
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-3">
                {selectedEmployee ? (
                  <EmployeeDetailsPanel
                    employee={selectedEmployee}
                    categoriesCount={categories.length}
                    onEditSkills={() =>
                      setSkillsEmployeeId(selectedEmployee.id)
                    }
                  />
                ) : (
                  <EmptyState text="Wybierz pracownika z listy, aby zobaczyc szczegoly." />
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <AddEmployeeModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />

      <EmployeeSkillsModal
        open={!!skillsEmployee}
        employee={skillsEmployee}
        categories={categories}
        assets={assets}
        onClose={() => setSkillsEmployeeId(null)}
        onSaved={handleSkillsSaved}
      />
    </>
  );
}

function EmployeeRow({
  employee,
  selected,
  onSelect,
  onEditSkills,
}: {
  employee: EmployeeDto;
  selected: boolean;
  onSelect: () => void;
  onEditSkills: () => void;
}) {
  const maintainSkillsCount = employee.skills.filter(
    (skill) => skill.canMaintain,
  ).length;
  const approveSkillsCount = employee.skills.filter(
    (skill) => skill.canApproveMaintenance,
  ).length;

  return (
    <div
      className={[
        "rounded-2xl border px-3 py-3 transition",
        selected
          ? "border-cyan-400/35 bg-cyan-400/[0.08]"
          : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="line-clamp-1 text-sm font-semibold text-white">
              {employee.firstName} {employee.lastName}
            </div>

            <StatusBadge status={employee.status} />

            {employee.skills.length === 0 ? (
              <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2 py-0.5 text-[11px] font-semibold text-amber-100">
                Brak uprawnien
              </span>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{employee.employeeNumber}</span>
            <span>{employee.jobTitle ?? "Bez stanowiska"}</span>
            <span>{employee.departmentName ?? "Bez dzialu"}</span>
            <span>Tel.: {employee.phone ?? "-"}</span>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <SmallCounter
            label="Uprawn."
            value={String(employee.skills.length)}
          />
          <SmallCounter label="UR" value={String(maintainSkillsCount)} />
          <SmallCounter label="Akcept." value={String(approveSkillsCount)} />

          <button
            type="button"
            onClick={onEditSkills}
            className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
          >
            Uprawnienia
          </button>
        </div>
      </div>

      {employee.skills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {employee.skills.slice(0, 6).map((skill) => (
            <span
              key={skill.id}
              className="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-400"
            >
              {skill.scopeLabel}: {permissionScopeSummary(skill)}
            </span>
          ))}

          {employee.skills.length > 6 ? (
            <span className="rounded-full border border-slate-800 bg-slate-900/80 px-2 py-0.5 text-[11px] text-slate-500">
              +{employee.skills.length - 6}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EmployeeDetailsPanel({
  employee,
  categoriesCount,
  onEditSkills,
}: {
  employee: EmployeeDto;
  categoriesCount: number;
  onEditSkills: () => void;
}) {
  const operateSkillsCount = employee.skills.filter(
    (skill) => skill.canOperate,
  ).length;
  const maintainSkillsCount = employee.skills.filter(
    (skill) => skill.canMaintain,
  ).length;
  const approveSkillsCount = employee.skills.filter(
    (skill) => skill.canApproveMaintenance,
  ).length;

  const coveragePercent =
    categoriesCount > 0
      ? Math.round((employee.skills.length / categoriesCount) * 100)
      : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={employee.status} />
          <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-xs text-slate-300">
            {employee.employeeNumber}
          </span>
        </div>

        <div className="mt-3 text-lg font-bold leading-tight text-white">
          {employee.firstName} {employee.lastName}
        </div>

        <div className="mt-1 text-sm text-slate-400">
          {employee.jobTitle ?? "Bez stanowiska"} /{" "}
          {employee.departmentName ?? "Bez dzialu"}
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <DetailTile label="Telefon" value={employee.phone ?? "-"} />
          <DetailTile
            label="Status"
            value={statusLabels[employee.status]}
            tone={getStatusTone(employee.status)}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <DetailTile
          label="Uprawnienia"
          value={String(employee.skills.length)}
          tone={employee.skills.length > 0 ? "cyan" : "amber"}
        />
        <DetailTile
          label="Pokrycie kategorii"
          value={`${coveragePercent}%`}
          tone={coveragePercent >= 70 ? "emerald" : "slate"}
        />
        <DetailTile label="Obsluga" value={String(operateSkillsCount)} />
        <DetailTile
          label="Utrzymanie ruchu"
          value={String(maintainSkillsCount)}
          tone="cyan"
        />
        <DetailTile
          label="Akceptacje"
          value={String(approveSkillsCount)}
          tone="violet"
        />
        <DetailTile label="Kategorie maszyn" value={String(categoriesCount)} />
        <DetailTile
          label="Przypisane maszyny"
          value={String(employee.assignedAssets.length)}
          tone={employee.assignedAssets.length > 0 ? "emerald" : "slate"}
        />
      </div>

      <button
        type="button"
        onClick={onEditSkills}
        className="w-full rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
      >
        Zarzadzaj uprawnieniami
      </button>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Uprawnienia maszynowe
        </div>

        {employee.skills.length > 0 ? (
          <div className="space-y-2">
            {employee.skills.map((skill) => (
              <div
                key={skill.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-semibold text-white">
                      {skill.scopeLabel}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {[
                        skill.isMachineSpecific
                          ? `Maszyna: ${skill.assetName ?? "nieznana"}`
                          : `Kategoria: ${skill.assetCategoryName}`,
                        permissionScopeSummary(skill),
                      ].join(" / ")}
                    </div>
                  </div>

                  <SkillLevelBadge level={skill.skillLevel} />
                </div>

                {skill.notes ? (
                  <div className="mt-2 line-clamp-2 text-xs text-slate-500">
                    {skill.notes}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Brak przypisanych uprawnien. Dodaj kategorie, aby wykorzystac je przy przegladach i zleceniach." />
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Aktywnie przypisane maszyny
        </div>

        {employee.assignedAssets.length > 0 ? (
          <div className="space-y-2">
            {employee.assignedAssets.map((asset) => (
              <Link
                key={asset.assetId}
                to={`/machines/${asset.assetId}`}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-3 transition hover:border-cyan-400/25 hover:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="line-clamp-1 text-sm font-semibold text-white">
                    {asset.assetName}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[
                      asset.assetCode,
                      asset.assetCategoryName ?? "Bez kategorii",
                    ]
                      .filter(Boolean)
                      .join(" / ")}
                  </div>
                </div>

                <div className="shrink-0 text-right text-xs text-slate-500">
                  <div>
                    {new Date(asset.assignedAtUtc).toLocaleDateString("pl-PL")}
                  </div>
                  <div>
                    {asset.dueBackAtUtc
                      ? `Do: ${new Date(asset.dueBackAtUtc).toLocaleDateString("pl-PL")}`
                      : "Bez terminu"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState text="Brak aktywnie przypisanych maszyn." />
        )}
      </div>
    </div>
  );
}

function SummaryCard({
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

function DetailTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>

      <div className="mt-1 line-clamp-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SmallCounter({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-right">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="text-xs font-semibold text-slate-200">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
        getStatusTone(status),
      )}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function SkillLevelBadge({ level }: { level: EmployeeSkillLevel }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
        getSkillLevelTone(level),
      )}`}
    >
      {skillLevelLabels[level]}
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
