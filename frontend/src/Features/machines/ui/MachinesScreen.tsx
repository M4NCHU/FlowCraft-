import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { assetsApi } from "../api/assetsApi";
import {
  AssetStatus,
  AssetType,
  type AssetDetailsDto,
  type AssetListItemDto,
} from "../api/contracts";
import type {
  SortDir,
  SortKey,
  StatusVal,
} from "./Components/MachinesFiltersClean";
import { MachineCreateModal } from "./Components/MachineCreateModal";

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

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
      setMachines(
        (data ?? []).filter((asset) => asset.type === AssetType.Machine),
      );
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
          statusLabels[machine.status].toLowerCase().includes(normalizedQuery),
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

  const metrics = useMemo(() => {
    const active = machines.filter((machine) => machine.isActive);
    const inactive = machines.length - active.length;

    const available = machines.filter(
      (machine) => machine.status === AssetStatus.Available,
    );

    const inUse = machines.filter(
      (machine) => machine.status === AssetStatus.InUse,
    );

    const inMaintenance = machines.filter(
      (machine) => machine.status === AssetStatus.InMaintenance,
    );

    const broken = machines.filter(
      (machine) => machine.status === AssetStatus.Broken,
    );

    const withoutCategory = machines.filter((machine) => !machine.categoryId);

    return {
      total: machines.length,
      active: active.length,
      inactive,
      available: available.length,
      inUse: inUse.length,
      inMaintenance: inMaintenance.length,
      broken: broken.length,
      withoutCategory: withoutCategory.length,
    };
  }, [machines]);

  const hasActiveFilters =
    q.trim().length > 0 || status !== "" || sortBy !== "name" || dir !== "asc";

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
      <div className="h-[85vh] min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-3 text-slate-100 shadow-2xl shadow-slate-950/40">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-xl shadow-slate-950/25">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                    Zasoby
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {metrics.active} aktywnych
                  </span>

                  {metrics.broken > 0 ? (
                    <span className="rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-100">
                      {metrics.broken} uszkodzonych
                    </span>
                  ) : null}

                  {metrics.inMaintenance > 0 ? (
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      {metrics.inMaintenance} w serwisie
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Maszyny
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Lista parku maszynowego z najważniejszym statusem i szybkim
                  przejściem do przeglądów, działań oraz planu hali.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link to="/maintenance" className={headerButtonClassName}>
                  Harmonogram przeglądów
                </Link>

                <Link
                  to="/machine-categories"
                  className={headerButtonClassName}
                >
                  Kategorie maszyn
                </Link>

                <button
                  type="button"
                  onClick={() => void loadMachines()}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Odśwież
                </button>

                <button
                  type="button"
                  onClick={() => setOpenAdd(true)}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Dodaj maszynę
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-6">
              <SummaryCard
                label="Wszystkie"
                value={String(metrics.total)}
                hint={`Nieaktywne: ${metrics.inactive}`}
                tone="slate"
              />

              <SummaryCard
                label="Dostępne"
                value={String(metrics.available)}
                hint="Gotowe do pracy"
                tone="emerald"
              />

              <SummaryCard
                label="W użyciu"
                value={String(metrics.inUse)}
                hint="Aktualnie pracują"
                tone="cyan"
              />

              <SummaryCard
                label="W serwisie"
                value={String(metrics.inMaintenance)}
                hint="Utrzymanie ruchu"
                tone={metrics.inMaintenance > 0 ? "amber" : "slate"}
              />

              <SummaryCard
                label="Uszkodzone"
                value={String(metrics.broken)}
                hint="Wymagają reakcji"
                tone={metrics.broken > 0 ? "rose" : "slate"}
              />

              <SummaryCard
                label="Bez kategorii"
                value={String(metrics.withoutCategory)}
                hint="Do uporządkowania"
                tone={metrics.withoutCategory > 0 ? "amber" : "slate"}
              />
            </div>
          </section>

          {error ? <AlertBox tone="rose">{error.message}</AlertBox> : null}

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Lista maszyn
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Filtry pomagają szybko zawęzić park maszynowy do konkretnego
                    statusu, kategorii lub kodu.
                  </p>
                </div>

                <span className="inline-flex rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
                  {loading
                    ? "Ładowanie danych..."
                    : `Pokazano ${filtered.length} z ${machines.length} maszyn`}
                </span>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[1.3fr_0.85fr_0.75fr_auto]">
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Szukaj po nazwie, kodzie, kategorii lub statusie..."
                  className={inputClassName}
                />

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value === ""
                        ? ""
                        : (Number(event.target.value) as StatusVal),
                    )
                  }
                  className={inputClassName}
                >
                  <option value="">Wszystkie statusy</option>
                  {Object.values(AssetStatus).map((value) =>
                    typeof value === "number" ? (
                      <option key={value} value={value}>
                        {statusLabels[value as AssetStatus]}
                      </option>
                    ) : null,
                  )}
                </select>

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortKey)}
                  className={inputClassName}
                >
                  <option value="name">Nazwa</option>
                  <option value="status">Status</option>
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDir((current) => (current === "asc" ? "desc" : "asc"))
                    }
                    className={headerButtonClassName}
                  >
                    {dir === "asc" ? "Rosnąco" : "Malejąco"}
                  </button>

                  <button
                    type="button"
                    onClick={reset}
                    disabled={!hasActiveFilters}
                    className={headerButtonClassName}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {hasActiveFilters ? (
                <div className="mt-2 text-xs text-slate-500">
                  Aktywne filtrowanie zawęża listę maszyn. Reset przywraca
                  domyślny widok alfabetyczny.
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">
                  Ładowanie maszyn...
                </div>
              ) : null}

              {!loading && !error && filtered.length === 0 ? (
                <EmptyState text="Brak maszyn spełniających kryteria." />
              ) : null}

              {!loading && !error && filtered.length > 0 ? (
                <div className="space-y-2">
                  {filtered.map((machine) => (
                    <MachineRow key={machine.id} machine={machine} />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <MachineCreateModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

function MachineRow({ machine }: { machine: AssetListItemDto }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_0.65fr_0.9fr_0.7fr_1.55fr]">
        <div className="min-w-0">
          <Link
            to={`/machines/${machine.id}`}
            className="line-clamp-1 text-sm font-semibold text-cyan-100 hover:underline"
          >
            {machine.name}
          </Link>

          <div className="mt-1 text-xs text-slate-500">
            {machine.isActive ? "Aktywna" : "Nieaktywna"}
            {machine.isMobile ? " · mobilna" : ""}
          </div>
        </div>

        <InfoCell label="Kod" value={machine.code} />

        <InfoCell
          label="Kategoria"
          value={machine.category ?? "Bez kategorii"}
        />

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Status
          </div>

          <Badge tone={statusTone(machine.status)}>
            {statusLabels[machine.status]}
          </Badge>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Akcje
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={`/machines/${machine.id}`}
              className={primaryCompactButtonClassName}
            >
              Szczegóły
            </Link>

            <Link
              to={`/activity?assetId=${encodeURIComponent(machine.id)}`}
              className={compactButtonClassName}
            >
              Działania
            </Link>

            <Link
              to={`/maintenance?assetId=${encodeURIComponent(machine.id)}`}
              className={compactButtonClassName}
            >
              Przeglądy
            </Link>

            <Link
              to={`/maintenance?assetId=${encodeURIComponent(machine.id)}&create=1`}
              className={compactButtonClassName}
            >
              Dodaj plan
            </Link>

            <Link
              to={`/editor?machineId=${encodeURIComponent(machine.id)}`}
              className={compactButtonClassName}
            >
              Pokaż na planie
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>

      <div className="line-clamp-2 text-sm font-medium text-slate-300">
        {value}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-65">
        {label}
      </div>

      <div className="mt-1 truncate text-lg font-bold leading-none">
        {value}
      </div>

      <div className="mt-1 truncate text-xs opacity-70">{hint}</div>
    </div>
  );
}

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass(
        tone,
      )}`}
    >
      {children}
    </span>
  );
}

function AlertBox({
  tone,
  children,
}: {
  tone: "amber" | "rose";
  children: ReactNode;
}) {
  const className =
    tone === "rose"
      ? "border-rose-400/25 bg-rose-400/[0.08] text-rose-100"
      : "border-amber-400/25 bg-amber-400/[0.08] text-amber-100";

  return (
    <div
      className={`shrink-0 rounded-2xl border px-4 py-2 text-sm ${className}`}
    >
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-3 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}

function statusTone(status: AssetStatus): Tone {
  if (status === AssetStatus.Available) return "emerald";
  if (status === AssetStatus.InUse) return "cyan";
  if (status === AssetStatus.InMaintenance) return "amber";
  if (status === AssetStatus.Broken) return "rose";

  return "slate";
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    slate: "border-slate-800 bg-slate-950/60 text-slate-100",
    cyan: "border-cyan-400/25 bg-cyan-400/[0.08] text-cyan-100",
    emerald: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100",
    amber: "border-amber-400/25 bg-amber-400/[0.08] text-amber-100",
    rose: "border-rose-400/25 bg-rose-400/[0.08] text-rose-100",
    violet: "border-violet-400/25 bg-violet-400/[0.08] text-violet-100",
  };

  return classes[tone];
}

const inputClassName =
  "rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-60";

const headerButtonClassName =
  "rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";

const compactButtonClassName =
  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const primaryCompactButtonClassName =
  "rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]";
