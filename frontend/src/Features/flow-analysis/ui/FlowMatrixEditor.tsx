import { PageHeader } from "../../../shared/ui/PageHeader";
import { FlowSummaryPanel } from "./FlowSummaryPanel";
import { SankeyPlaceholder } from "./SankeyPlaceholder";
import { useFlowMatrix } from "../model/useFlowMatrix";

export function FlowMatrixEditor() {
  const { employees, summary, loading, error, reload } = useFlowMatrix();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Analiza przeplywu"
        extra={
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Odswiez
          </button>
        }
      />

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">
          Ladowanie danych do analizy przeplywu...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error.message}
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <FlowSummaryPanel summary={summary} />

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Macierz kompetencji
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Prosty widok kontrolny pracownikow i liczby przypisanych umiejetnosci.
              </p>
            </div>

            {employees.length === 0 ? (
              <div className="py-8 text-sm text-slate-500">
                Brak danych pracownikow do pokazania.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="py-2">Pracownik</th>
                    <th className="py-2">Stanowisko</th>
                    <th className="py-2">Dzial</th>
                    <th className="py-2">Umiejetnosci</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-b last:border-0">
                      <td className="py-2">
                        {employee.firstName} {employee.lastName}
                      </td>
                      <td className="py-2">{employee.jobTitle ?? "-"}</td>
                      <td className="py-2">{employee.departmentName ?? "-"}</td>
                      <td className="py-2">{employee.skills.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <SankeyPlaceholder summary={summary} />
        </>
      ) : null}
    </div>
  );
}
