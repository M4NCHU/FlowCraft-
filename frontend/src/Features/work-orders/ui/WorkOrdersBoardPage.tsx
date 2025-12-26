import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";

const COLS: Record<string, { id: string; title: string; machine: string }[]> = {
  open: [{ id: "wo-101", title: "Wymiana filtra", machine: "TRUMPF 3030" }],
  in_progress: [
    { id: "wo-102", title: "Przegląd kwartalny", machine: "DMG MORI" },
  ],
  done: [{ id: "wo-100", title: "Kalibracja osi", machine: "TRUMPF 3030" }],
};

export function WorkOrdersBoardPage() {
  return (
    <>
      <PageHeader title="Zlecenia serwisowe" />
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(COLS).map(([col, items]) => (
          <div key={col} className="rounded-xl bg-white p-4 shadow">
            <div className="font-medium mb-3 uppercase text-xs">{col}</div>
            <div className="flex flex-col gap-3">
              {items.map((x) => (
                <Link
                  key={x.id}
                  to={`/work-orders/${x.id}`}
                  className="rounded-lg border p-3 hover:bg-slate-50"
                >
                  <div className="font-medium">{x.title}</div>
                  <div className="text-xs text-slate-600">{x.machine}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
