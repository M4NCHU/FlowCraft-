import { useEffect, useState } from "react";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ApiError, toApiError } from "../../../shared/api/httpClient";
import { employeesApi } from "../api/employeesApi";
import { EmployeeStatus, type EmployeeDto } from "../api/contracts";
import { AddEmployeeModal } from "./components/AddEmployeeModal";

const statusLabels: Record<EmployeeStatus, string> = {
  [EmployeeStatus.Active]: "Aktywny",
  [EmployeeStatus.OnLeave]: "Nieobecny",
  [EmployeeStatus.Suspended]: "Zawieszony",
  [EmployeeStatus.Terminated]: "Zakończono wsp?lprace",
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  const loadEmployees = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const data = await employeesApi.list({ signal });
      setEmployees(data ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      setError(toApiError(err, "Nie udało się pobrać pracowników."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadEmployees(controller.signal);

    return () => controller.abort();
  }, []);

  const handleCreated = (employee: EmployeeDto) => {
    setEmployees((prev) => [employee, ...prev]);
  };

  return (
    <>
      <PageHeader
        title="Pracownicy"
        extra={
          <div className="flex items-center gap-3">
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
      <div className="rounded-xl bg-white p-4 shadow">
        {loading && (
          <div className="py-10 text-center text-sm text-slate-500">
            Ładowanie pracowników...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error.message}
          </div>
        )}

        {!loading && !error && employees.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-500">
            Brak pracowników.
          </div>
        )}

        {!loading && !error && employees.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Nr pracownika</th>
                <th className="py-2">Imie i nazwisko</th>
                <th className="py-2">Stanowisko</th>
                <th className="py-2">Dział</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b last:border-0">
                  <td className="py-2">{employee.employeeNumber}</td>
                  <td className="py-2">
                    {employee.firstName} {employee.lastName}
                  </td>
                  <td className="py-2">{employee.jobTitle ?? "-"}</td>
                  <td className="py-2">{employee.departmentName ?? "-"}</td>
                  <td className="py-2">
                    {statusLabels[employee.status] ?? String(employee.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AddEmployeeModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
