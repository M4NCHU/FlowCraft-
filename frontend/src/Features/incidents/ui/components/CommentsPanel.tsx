import { useState } from "react";
import { useIncidentsStore } from "../../../../entities/incidents/model/useIncidentsStore";

export function CommentsPanel({ incidentId }: { incidentId: string }) {
  const incident = useIncidentsStore((s) =>
    s.incidents.find((i) => i.id === incidentId)
  );
  const addComment = useIncidentsStore((s) => s.addComment);
  const [msg, setMsg] = useState("");

  if (!incident) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = msg.trim();
    if (!m) return;
    addComment(incidentId, "mszwast", m);
    setMsg("");
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {(incident.comments ?? []).map((c) => (
          <li
            key={c.id}
            className="rounded-md border border-slate-200 bg-white p-3"
          >
            <div className="mb-1 text-xs text-slate-500">
              {c.author} • {new Date(c.createdAt).toLocaleString()}
            </div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap">
              {c.message}
            </div>
          </li>
        ))}
        {(!incident.comments || incident.comments.length === 0) && (
          <li className="text-sm text-slate-500">Brak komentarzy.</li>
        )}
      </ul>

      <form onSubmit={submit} className="flex items-start gap-2">
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={3}
          placeholder="Dodaj komentarz…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
        <button
          type="submit"
          className="h-10 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
        >
          Wyślij
        </button>
      </form>
    </div>
  );
}
