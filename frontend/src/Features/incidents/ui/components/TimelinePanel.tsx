import { useIncidentsStore } from "../../../../entities/incidents/model/useIncidentsStore";

const labels: Record<string, string> = {
  created: "Utworzono",
  status_changed: "Zmiana statusu",
  assigned: "Przypisano",
  work_scheduled: "Zaplano­wano serwis",
  note: "Notatka",
  attachment_added: "Dodano załącznik",
  resolved: "Zamknięto",
};

export function TimelinePanel({ incidentId }: { incidentId: string }) {
  const incident = useIncidentsStore((s) =>
    s.incidents.find((i) => i.id === incidentId)
  );
  if (!incident) return null;

  const events = (incident.events ?? [])
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li
          key={e.id}
          className="rounded-md border border-slate-200 bg-white p-3 text-sm"
        >
          <div className="mb-1 text-xs text-slate-500">
            {new Date(e.createdAt).toLocaleString()}
          </div>
          <div className="font-medium text-slate-900">
            {labels[e.type] ?? e.type}
          </div>
          {e.meta && (
            <div className="mt-1 text-xs text-slate-600">
              {Object.entries(e.meta).map(([k, v]) => (
                <span key={k} className="mr-3">
                  <span className="text-slate-500">{k}:</span> {v}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
      {events.length === 0 && (
        <li className="text-sm text-slate-500">Brak zdarzeń.</li>
      )}
    </ul>
  );
}
