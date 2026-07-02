import type { FlowMetricsSummary } from "../lib/flowMetrics";

export function SankeyPlaceholder({
  summary,
}: {
  summary: FlowMetricsSummary;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
      <div className="text-sm font-medium text-slate-900">
        Sankey / analiza przeplywu
      </div>
      <p className="mt-2 text-sm text-slate-600">
        Ten widok jest przygotowany jako placeholder pod przyszla wizualizacje
        przeplywu kompetencji i obciazenia pracownikow.
      </p>
      <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        <div>Aktywni pracownicy: {summary.activeEmployees}</div>
        <div>Dostepni dzisiaj: {summary.availableEmployees}</div>
        <div>Pokryte kategorie: {summary.categoriesCovered}</div>
        <div>Trenerzy: {summary.trainersCount}</div>
      </div>
    </div>
  );
}
