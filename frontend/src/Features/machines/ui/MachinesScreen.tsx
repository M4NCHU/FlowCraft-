import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { assetsApi } from "../api/assetsApi";
import {
  AssetStatus,
  AssetType,
  type AssetDetailsDto,
  type AssetListItemDto,
} from "../api/contracts";
import {
  MachinesFiltersClean,
  type SortDir,
  type SortKey,
  type StatusVal,
} from "./Components/MachinesFiltersClean";
import { MachineCreateModal } from "./Components/MachineCreateModal";

const pillClasses: Record<AssetStatus, string> = {
  [AssetStatus.Available]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [AssetStatus.InUse]: "border-sky-200 bg-sky-50 text-sky-700",
  [AssetStatus.InMaintenance]: "border-amber-200 bg-amber-50 text-amber-800",
  [AssetStatus.Broken]: "border-rose-200 bg-rose-50 text-rose-700",
  [AssetStatus.Retired]: "border-slate-200 bg-slate-100 text-slate-700",
};

const statusLabels: Record<AssetStatus, string> = {
  [AssetStatus.Available]: "Dostępna",
  [AssetStatus.InUse]: "W użyciu",
  [AssetStatus.InMaintenance]: "W serwisie",
  [AssetStatus.Broken]: "Uszkodzona",
  [AssetStatus.Retired]: "Wycofana",
};

export function MachinesScreen() {
  const [machines, setMachines] = useState<AssetListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
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

  const loadMachines = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const data = await assetsApi.list({ signal });
      setMachines((data ?? []).filter((asset) => asset.type === AssetType.Machine));
    } catch (err) {
      if (signal?.aborted) return;
      setError(toApiError(err, "Nie udało się pobrać listy maszyn."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadMachines(controller.signal);

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = q.trim().toLowerCase();
    let base = machines.slice();

    if (normalizedQuery) {
      base = base.filter(
        (machine) =>
          machine.name.toLowerCase().includes(normalizedQuery) ||
          machine.code.toLowerCase().includes(normalizedQuery) ||
          (machine.category ?? "").toLowerCase().includes(normalizedQuery) ||
          statusLabels[machine.status].toLowerCase().includes(normalizedQuery)
      );
    }

    if (status) {
      base = base.filter((machine) => machine.status === status);
    }

    base.sort((a, b) => {
      const left =
        sortBy === "status"
          ? statusLabels[a.status]
          : a.name.toLocaleLowerCase("pl");
      const right =
        sortBy === "status"
          ? statusLabels[b.status]
          : b.name.toLocaleLowerCase("pl");

      if (left < right) return dir === "asc" ? -1 : 1;
      if (left > right) return dir === "asc" ? 1 : -1;
      return 0;
    });

    return base;
  }, [dir, machines, q, sortBy, status]);

  const handleCreated = (asset: AssetDetailsDto) => {
    setMachines((prev) => [
      {
        id: asset.id,
        name: asset.name,
        code: asset.code,
        categoryId: asset.categoryId,
        type: asset.type,
        status: asset.status,
        category: asset.category,
        isMobile: asset.isMobile,
        isActive: asset.isActive,
        createdAtUtc: asset.createdAtUtc,
        updatedAtUtc: asset.updatedAtUtc,
      },
      ...prev,
    ]);
  };

  return (
    <>
      <PageHeader
        title="Maszyny"
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/maintenance"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Harmonogram przeglądów
            </Link>
            <Link
              to="/machine-categories"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Kategorie maszyn
            </Link>
            <button
              onClick={() => void loadMachines()}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Odśwież
            </button>
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Dodaj maszynę
            </button>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <MachinesFiltersClean
          q={q}
          onQChange={setQ}
          status={status}
          onStatusChange={setStatus}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          dir={dir}
          onToggleDir={() =>
            setDir((current) => (current === "asc" ? "desc" : "asc"))
          }
          onReset={reset}
        />
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">
            Ładowanie maszyn...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error.message}
          </div>
        ) : null}

        {!loading && !error ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2">Nazwa</th>
                  <th className="py-2">Kod</th>
                  <th className="py-2">Kategoria</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 w-80">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((machine) => (
                  <tr key={machine.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="flex flex-col">
                        <Link
                          to={`/machines/${machine.id}`}
                          className="font-medium text-sky-700 hover:underline"
                        >
                          {machine.name}
                        </Link>
                        <span className="text-xs text-slate-500">
                          {machine.isActive ? "Aktywna" : "Nieaktywna"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">{machine.code}</td>
                    <td className="py-3">{machine.category ?? "Bez kategorii"}</td>
                    <td className="py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                          pillClasses[machine.status],
                        ].join(" ")}
                      >
                        {statusLabels[machine.status]}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/machines/${machine.id}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Szczegóły
                        </Link>
                        <Link
                          to={`/activity?assetId=${encodeURIComponent(machine.id)}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Działania
                        </Link>
                        <Link
                          to={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Przeglądy
                        </Link>
                        <Link
                          to={`/maintenance?assetId=${encodeURIComponent(machine.id)}&create=1`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Dodaj plan
                        </Link>
                        <Link
                          to={`/editor?machineId=${encodeURIComponent(machine.id)}`}
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          Pokaż na planie
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Brak maszyn spełniających kryteria.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <MachineCreateModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
