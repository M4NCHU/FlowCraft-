import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { departmentsApi } from "../api/departmentsApi";
import type { DepartmentDto } from "../api/contracts";
import { AddDepartmentModal } from "./components/AddDepartmentModal";

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  const loadDepartments = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const data = await departmentsApi.list({ includeInactive: true, signal });
      setDepartments(data ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(toApiError(err, "Nie udało się pobrać działów."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadDepartments(controller.signal);

    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => {
    const active = departments.filter((department) => department.isActive);
    const employees = departments.reduce(
      (sum, department) => sum + department.employeesCount,
      0
    );

    return {
      activeCount: active.length,
      inactiveCount: departments.length - active.length,
      employeesCount: employees,
    };
  }, [departments]);

  const handleCreated = (department: DepartmentDto) => {
    setDepartments((prev) =>
      [department, ...prev].sort((a, b) => a.name.localeCompare(b.name, "pl"))
    );
  };

  return (
    <>
      <PageHeader
        title="Działy"
        extra={
          <div className="flex items-center gap-3">
            <Link
              to="/employees"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Pracownicy
            </Link>
            <Link
              to="/lean"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Lean
            </Link>
            <button
              onClick={() => void loadDepartments()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj dział
            </button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Aktywne działy"
          value={String(metrics.activeCount)}
          hint={`Nieaktywne: ${metrics.inactiveCount}`}
        />
        <MetricCard
          label="Przypisani pracownicy"
          value={String(metrics.employeesCount)}
          hint="Suma aktywnych przypisań do działów"
        />
        <MetricCard
          label="Wszystkie rekordy"
          value={String(departments.length)}
          hint="Master data dla organizacji i lean boardu"
        />
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Ładowanie działów...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error.message}
          </div>
        ) : null}

        {!loading && !error && departments.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Brak działów. Dodaj pierwszy obszar organizacji, aby porządkować pracowników i usprawnienia.
          </div>
        ) : null}

        {!loading && !error && departments.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Nazwa</th>
                <th className="py-2">Kod</th>
                <th className="py-2">Strumień wartości</th>
                <th className="py-2">Pracownicy</th>
                <th className="py-2">Status</th>
                <th className="py-2">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id} className="border-b last:border-0">
                  <td className="py-2">
                    <div className="font-medium text-slate-900">
                      {department.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {department.description?.trim() || "Brak opisu"}
                    </div>
                  </td>
                  <td className="py-2">{department.code}</td>
                  <td className="py-2">{department.valueStream ?? "-"}</td>
                  <td className="py-2">{department.employeesCount}</td>
                  <td className="py-2">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                        department.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-700",
                      ].join(" ")}
                    >
                      {department.isActive ? "Aktywny" : "Nieaktywny"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to="/employees"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Podgląd pracowników
                      </Link>
                      <Link
                        to="/lean"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Usprawnienia
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <AddDepartmentModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

function MetricCard({
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
