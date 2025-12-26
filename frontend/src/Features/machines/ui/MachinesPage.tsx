import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { useMachinesStore } from "../../../entities/machines/model/useMachinesStore";
import {
  MachinesFilters,
  type SortDir,
  type SortKey,
  type StatusVal,
} from "./components/MachinesFilters";
import { AddMachineModal } from "./components/AddMachineModal";

const pillCls: Record<string, string> = {
  operational: "bg-emerald-50 text-emerald-700 border-emerald-200",
  maintenance: "bg-amber-50 text-amber-800 border-amber-200",
  down: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusLabel: Record<string, string> = {
  operational: "Sprawna",
  maintenance: "Przegląd/serwis",
  down: "Niesprawna",
};

export function MachinesPage() {
  const machines = useMachinesStore((s) => s.machines);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusVal>("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [dir, setDir] = useState<SortDir>("asc");
  const [openAdd, setOpenAdd] = useState(false);

  const reset = () => {
    setQ("");
    setStatus("");
    setSortBy("name");
    setDir("asc");
  };

  const filtered = useMemo(() => {
    const norm = q.trim().toLowerCase();

    let base = machines.slice();

    if (norm) {
      base = base.filter(
        (m) =>
          m.name.toLowerCase().includes(norm) ||
          (m.model ?? "").toLowerCase().includes(norm) ||
          m.status.toLowerCase().includes(norm)
      );
    }

    if (status) {
      base = base.filter((m) => m.status === status);
    }

    base.sort((a, b) => {
      const av = (a[sortBy] ?? "").toString().toLowerCase();
      const bv = (b[sortBy] ?? "").toString().toLowerCase();
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });

    return base;
  }, [machines, q, status, sortBy, dir]);

  return (
    <>
      <PageHeader
        title="Maszyny"
        extra={
          <div className="flex items-center gap-3">
            <MachinesFilters
              q={q}
              onQChange={setQ}
              status={status}
              onStatusChange={setStatus}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              dir={dir}
              onToggleDir={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
              onReset={reset}
            />
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj maszynę
            </button>
          </div>
        }
      />

      <div className="rounded-xl bg-white p-4 shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="py-2">Nazwa</th>
              <th className="py-2">Model</th>
              <th className="py-2">Status</th>
              <th className="py-2 w-40">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="py-2">
                  <Link
                    to={`/machines/${m.id}`}
                    className="text-sky-700 hover:underline"
                  >
                    {m.name}
                  </Link>
                </td>
                <td className="py-2">{m.model ?? "—"}</td>
                <td className="py-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      pillCls[m.status] ??
                        "bg-slate-100 text-slate-700 border-slate-200",
                    ].join(" ")}
                  >
                    {statusLabel[m.status] ?? m.status}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <Link
                      to={`/machines/${m.id}`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Szczegóły
                    </Link>
                    <Link
                      to={`/editor?machineId=${m.id}`}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Pokaż na planie
                    </Link>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  Brak wyników.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddMachineModal open={openAdd} onClose={() => setOpenAdd(false)} />
    </>
  );
}
