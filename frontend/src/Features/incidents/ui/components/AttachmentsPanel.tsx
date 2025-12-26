import { useRef } from "react";
import { useIncidentsStore } from "../../../../entities/incidents/model/useIncidentsStore";

export function AttachmentsPanel({ incidentId }: { incidentId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const incident = useIncidentsStore((s) =>
    s.incidents.find((i) => i.id === incidentId)
  );
  const addAttachment = useIncidentsStore((s) => s.addAttachment);
  if (!incident) return null;

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    addAttachment(incidentId, { name: f.name, size: f.size });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div>
        <input
          ref={inputRef}
          type="file"
          onChange={onPick}
          className="text-sm"
        />
      </div>
      <ul className="space-y-2">
        {(incident.attachments ?? []).map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="text-xs text-slate-500">
                {a.size ? `${Math.round(a.size / 1024)} KB` : "—"} •{" "}
                {new Date(a.uploadedAt).toLocaleString()}
              </div>
            </div>
            {a.url ? (
              <a
                href={a.url}
                className="text-sky-700 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Pobierz
              </a>
            ) : (
              <span className="text-xs text-slate-500">brak linku</span>
            )}
          </li>
        ))}
        {(!incident.attachments || incident.attachments.length === 0) && (
          <li className="text-sm text-slate-500">Brak załączników.</li>
        )}
      </ul>
    </div>
  );
}
