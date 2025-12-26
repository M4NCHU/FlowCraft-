import React from "react";
import { useEditorState } from "../../model/useEditorState";
import { useMachinesStore } from "../../../../entities/machines/model/useMachinesStore";
import { Link } from "react-router-dom";

export const MachineDetailsModal: React.FC = () => {
  const { openMachineDetailsId, setOpenMachineDetails } = useEditorState();
  const m = useMachinesStore((s) =>
    s.machines.find((x) => x.id === openMachineDetailsId)
  );

  if (!openMachineDetailsId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h3 className="text-sm font-semibold">
            Szczegóły maszyny {m ? `— ${m.name}` : ""}
          </h3>
          <button
            onClick={() => setOpenMachineDetails(null)}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
          >
            Zamknij
          </button>
        </div>
        <div className="px-4 py-3 text-sm">
          {m ? (
            <div className="space-y-2">
              <div>
                <span className="text-slate-500">Nazwa:</span> {m.name}
              </div>
              <div>
                <span className="text-slate-500">Model:</span> {m.model ?? "—"}
              </div>
              <div>
                <span className="text-slate-500">Status:</span> {m.status}
              </div>

              <div className="pt-2">
                <Link
                  to={`/machines/${m.id}`}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                >
                  Przejdź do karty maszyny
                </Link>
              </div>
            </div>
          ) : (
            <div>Nie znaleziono maszyny.</div>
          )}
        </div>
      </div>
    </div>
  );
};
