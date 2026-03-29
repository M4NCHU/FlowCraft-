import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { assetCategoriesApi } from "../../machines/api/assetCategoriesApi";
import { AssetType, type AssetCategoryDto } from "../../machines/api/contracts";
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

export function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [skillsEmployeeId, setSkillsEmployeeId] = useState<string | null>(null);

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
    ]);

    if (signal?.aborted) return;

    const [employeesResult, categoriesResult] = results;
    const firstRejected = results.find((result) => result.status === "rejected");

    setEmployees(
      employeesResult.status === "fulfilled" ? employeesResult.value ?? [] : []
    );
    setCategories(
      categoriesResult.status === "fulfilled" ? categoriesResult.value ?? [] : []
    );
    setLoading(false);
    setError(
      firstRejected
        ? toApiError(firstRejected.reason, "Nie udało się pobrać pracowników.")
        : null
    );
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadEmployees(controller.signal);

    return () => controller.abort();
  }, []);

  const handleCreated = (employee: EmployeeDto) => {
    setEmployees((prev) => [employee, ...prev]);
  };

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === skillsEmployeeId) ?? null,
    [employees, skillsEmployeeId]
  );

  const handleSkillsSaved = (
    employeeId: string,
    skills: UpsertEmployeeSkillRequest[]
  ) => {
    setEmployees((prev) =>
      prev.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              skills: skills.map((skill, index) => {
                const category = categories.find(
                  (entry) => entry.id === skill.assetCategoryId
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
                  createdAtUtc: new Date().toISOString(),
                  updatedAtUtc: new Date().toISOString(),
                };
              }),
            }
          : employee
      )
    );
  };

  const capabilityCoverage = useMemo(() => {
    if (employees.length === 0) return 0;
    return Math.round(
      (employees.filter((employee) => employee.skills.length > 0).length /
        employees.length) *
        100
    );
  }, [employees]);

  return (
    <>
      <PageHeader
        title="Pracownicy"
        extra={
          <div className="flex items-center gap-3">
            <Link
              to="/departments"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Działy
            </Link>
            <button
              onClick={() => void loadEmployees()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj pracownika
            </button>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Pracownicy aktywni"
          value={String(
            employees.filter((employee) => employee.status === EmployeeStatus.Active)
              .length
          )}
          hint="Osoby dostępne operacyjnie"
        />
        <SummaryCard
          label="Pokrycie kompetencji"
          value={`${capabilityCoverage}%`}
          hint="Pracownicy z przypisaną przynajmniej jedną kategorią"
        />
        <SummaryCard
          label="Kategorie kompetencji"
          value={String(categories.length)}
          hint="Bazują na zdefiniowanych kategoriach maszyn"
        />
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Ładowanie pracowników...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error.message}
          </div>
        ) : null}

        {!loading && !error && employees.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Brak pracowników.
          </div>
        ) : null}

        {!loading && !error && employees.length > 0 ? (
          <div className="space-y-4">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-slate-900">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {employee.employeeNumber}
                      {" · "}
                      {employee.jobTitle ?? "Bez stanowiska"}
                      {" · "}
                      {employee.departmentName ?? "Bez działu"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {statusLabels[employee.status]}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSkillsEmployeeId(employee.id)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edytuj kompetencje
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_0.9fr]">
                  <div>
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Macierz kompetencji
                    </div>
                    {employee.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {employee.skills.map((skill) => (
                          <div
                            key={skill.id}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
                          >
                            <div className="font-medium text-slate-900">
                              {skill.assetCategoryName}
                            </div>
                            <div>{skillLevelLabels[skill.skillLevel]}</div>
                            <div className="mt-1 text-slate-500">
                              {[
                                skill.canOperate ? "obsługa" : null,
                                skill.canMaintain ? "UTR" : null,
                                skill.canApproveMaintenance ? "akceptacja" : null,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "bez uprawnień operacyjnych"}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
                        Brak przypisanych kompetencji. Dodaj kategorie, aby wykorzystać
                        macierz przy przeglądach i zleceniach.
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Podsumowanie
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div>Telefon: {employee.phone ?? "-"}</div>
                      <div>Kompetencje: {employee.skills.length}</div>
                      <div>
                        Kategorie z UTR: {employee.skills.filter((skill) => skill.canMaintain).length}
                      </div>
                      <div>
                        Akceptacje przeglądów: {employee.skills.filter((skill) => skill.canApproveMaintenance).length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <AddEmployeeModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />

      <EmployeeSkillsModal
        open={!!selectedEmployee}
        employee={selectedEmployee}
        categories={categories}
        onClose={() => setSkillsEmployeeId(null)}
        onSaved={handleSkillsSaved}
      />
    </>
  );
}

function SummaryCard({
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
