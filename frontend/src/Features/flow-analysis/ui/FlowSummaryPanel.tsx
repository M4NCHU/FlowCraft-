import type { FlowMetricsSummary } from "../lib/flowMetrics";

export function FlowSummaryPanel({
  summary,
}: {
  summary: FlowMetricsSummary;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <SummaryCard
        label="Aktywni pracownicy"
        value={String(summary.activeEmployees)}
      />
      <SummaryCard
        label="Dostepni dzisiaj"
        value={String(summary.availableEmployees)}
      />
      <SummaryCard
        label="Osoby z UR"
        value={String(summary.maintainersCount)}
      />
      <SummaryCard
        label="Operatorzy"
        value={String(summary.operatorsCount)}
      />
      <SummaryCard
        label="Trenerzy"
        value={String(summary.trainersCount)}
      />
      <SummaryCard
        label="Pokryte kategorie"
        value={String(summary.categoriesCovered)}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
