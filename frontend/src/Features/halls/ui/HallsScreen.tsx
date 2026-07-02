import { type ReactNode, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../../shared/api/httpClient";
import type { HallDetailsResponse } from "../api/contracts";
import {
  formatAreaSqMeters,
  formatHallFootprint,
  getHallGeometrySummary,
} from "../lib/hallGeometry";
import { useHallsList } from "../model/useHallsList";
import { HallOutlinePreview } from "./components/HallOutlinePreview";
import type { HallsSortKey, SortDir } from "./components/HallsFilters";
import { AddHallDialogAscii } from "./AddHallDialogAscii";

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

export function HallsScreen() {
  const navigate = useNavigate();
  const { halls, loading, error, reload } = useHallsList();

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<HallsSortKey>("name");
  const [dir, setDir] = useState<SortDir>("asc");
  const [openAdd, setOpenAdd] = useState(false);

  const reset = () => {
    setQuery("");
    setSortBy("name");
    setDir("asc");
  };

  const filtered = useMemo(() => {
    const norm = query.trim().toLowerCase();

    const next = halls
      .filter((hall) => {
        if (!norm) return true;

        return (
          (hall.name ?? "").toLowerCase().includes(norm) ||
          (hall.code ?? "").toLowerCase().includes(norm)
        );
      })
      .slice();

    next.sort((a, b) => {
      const av = a[sortBy] as unknown;
      const bv = b[sortBy] as unknown;

      if (typeof av === "number" && typeof bv === "number") {
        if (av < bv) return dir === "asc" ? -1 : 1;
        if (av > bv) return dir === "asc" ? 1 : -1;
        return 0;
      }

      const as = (av ?? "").toString().toLowerCase();
      const bs = (bv ?? "").toString().toLowerCase();

      if (as < bs) return dir === "asc" ? -1 : 1;
      if (as > bs) return dir === "asc" ? 1 : -1;

      return 0;
    });

    return next;
  }, [dir, halls, query, sortBy]);

  const stats = useMemo(() => {
    const totalArea = halls.reduce((sum, hall) => sum + hall.areaSqMeters, 0);
    const totalSections = halls.reduce(
      (sum, hall) => sum + hall.sectionsCount,
      0,
    );
    const hallsWithSections = halls.filter(
      (hall) => hall.sectionsCount > 0,
    ).length;

    return {
      totalHalls: halls.length,
      totalArea,
      totalSections,
      hallsWithSections,
    };
  }, [halls]);

  const hasActiveFilters =
    query.trim().length > 0 || sortBy !== "name" || dir !== "asc";

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  const handleCreated = async (created: HallDetailsResponse) => {
    setOpenAdd(false);
    await reload();
    navigate(`/editor?hallId=${created.id}`);
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
                    Obiekty
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {stats.totalHalls} hal
                  </span>

                  {stats.hallsWithSections < stats.totalHalls ? (
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      {stats.totalHalls - stats.hallsWithSections} wymaga sekcji
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Hale
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Wybór hali do edycji layoutu, sprawdzenie skali obiektu i
                  szybkie przejście do definiowania sekcji, layoutu albo
                  raportów.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                  type="button"
                  onClick={() => setOpenAdd(true)}
                  disabled={loading}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Dodaj halę
                </button>

                <button
                  type="button"
                  onClick={reload}
                  disabled={loading}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Odśwież
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/editor")}
                  className={headerButtonClassName}
                >
                  Otwórz edytor
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Liczba hal"
                value={String(stats.totalHalls)}
                hint="Wszystkie obiekty"
                tone="slate"
              />

              <SummaryCard
                label="Łączna powierzchnia"
                value={`${formatNumber(stats.totalArea)} m²`}
                hint="Suma powierzchni hal"
                tone="cyan"
              />

              <SummaryCard
                label="Sekcje"
                value={String(stats.totalSections)}
                hint="Zdefiniowane obszary"
                tone="emerald"
              />

              <SummaryCard
                label="Hale z sekcjami"
                value={`${stats.hallsWithSections}/${stats.totalHalls || 0}`}
                hint="Gotowość layoutu"
                tone={stats.hallsWithSections > 0 ? "amber" : "slate"}
              />
            </div>
          </section>

          {isUnauthorized ? (
            <div className="shrink-0 rounded-2xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3 text-sm text-amber-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>Sesja wygasła albo brak autoryzacji.</span>

                <button
                  type="button"
                  className="rounded-xl border border-amber-400/25 bg-slate-950/60 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/[0.12]"
                  onClick={() => navigate("/login")}
                >
                  Zaloguj się
                </button>
              </div>
            </div>
          ) : null}

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Lista hal
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Od razu widać, która hala ma już sekcje, a która wymaga
                    dopiero przygotowania layoutu.
                  </p>
                </div>

                <span className="inline-flex rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
                  {loading
                    ? "Ładowanie danych..."
                    : `Pokazano ${filtered.length} z ${halls.length} hal`}
                </span>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_0.75fr_auto]">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj po nazwie lub kodzie hali..."
                  disabled={loading}
                  className={inputClassName}
                />

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as HallsSortKey)
                  }
                  disabled={loading}
                  className={inputClassName}
                >
                  <option value="name">Nazwa</option>
                  <option value="code">Kod</option>
                  <option value="areaSqMeters">Powierzchnia</option>
                  <option value="sectionsCount">Liczba sekcji</option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    setDir((value) => (value === "asc" ? "desc" : "asc"))
                  }
                  disabled={loading}
                  className={headerButtonClassName}
                >
                  {dir === "asc" ? "Rosnąco" : "Malejąco"}
                </button>

                <button
                  type="button"
                  onClick={reset}
                  disabled={loading || !hasActiveFilters}
                  className={headerButtonClassName}
                >
                  Reset
                </button>
              </div>

              {hasActiveFilters ? (
                <div className="mt-2 text-xs text-slate-500">
                  Aktywne filtrowanie pomaga szybciej znaleźć konkretną halę bez
                  przechodzenia przez całą listę.
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">
                  Ładowanie listy hal...
                </div>
              ) : null}

              {!loading && halls.length === 0 ? (
                <EmptyState
                  title="Brak hal w systemie"
                  description="Zacznij od dodania pierwszej hali. Po zapisaniu od razu przejdziesz do edytora layoutu."
                  primaryActionLabel="Dodaj pierwszą halę"
                  onPrimaryAction={() => setOpenAdd(true)}
                />
              ) : null}

              {!loading && halls.length > 0 && filtered.length === 0 ? (
                <EmptyState
                  title="Brak wyników dla tego filtra"
                  description="Spróbuj zmienić frazę wyszukiwania albo zresetuj sortowanie i filtry."
                  primaryActionLabel="Resetuj filtry"
                  onPrimaryAction={reset}
                />
              ) : null}

              {!loading && filtered.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {filtered.map((hall) => {
                    const hasSections = hall.sectionsCount > 0;
                    const geometry = getHallGeometrySummary(
                      hall.outlineJson,
                      hall.areaSqMeters,
                    );

                    return (
                      <article
                        key={hall.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="truncate text-base font-bold text-white">
                                {hall.name}
                              </h2>

                              <HallBadge hasSections={hasSections} />
                            </div>

                            <div className="mt-2 inline-flex rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-400">
                              Kod:{" "}
                              <span className="ml-1 text-slate-200">
                                {hall.code}
                              </span>
                            </div>
                          </div>

                          <Link
                            to={`/editor?hallId=${hall.id}`}
                            className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                          >
                            Layout
                          </Link>
                        </div>

                        <HallOutlinePreview
                          outlineJson={hall.outlineJson}
                          areaSqMeters={hall.areaSqMeters}
                          className="mt-4 h-28"
                        />

                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <MetricTile
                            label="Rozmiar"
                            value={formatHallFootprint(geometry)}
                            tone="violet"
                          />

                          <MetricTile
                            label="Powierzchnia"
                            value={formatAreaSqMeters(geometry.areaSqMeters)}
                            tone="cyan"
                          />

                          <MetricTile
                            label="Sekcje"
                            value={String(hall.sectionsCount)}
                            tone={hasSections ? "emerald" : "amber"}
                          />
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm leading-6 text-slate-400">
                          {hasSections
                            ? "Hala ma już sekcje. Możesz przejść do layoutu i dopracować rozmieszczenie maszyn."
                            : "Ta hala nie ma jeszcze sekcji. Następny krok to wejście do edytora i zdefiniowanie obrysu oraz stref pracy."}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            to={`/editor?hallId=${hall.id}`}
                            className={primaryCompactButtonClassName}
                          >
                            Edytuj layout
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/editor?hallId=${hall.id}`)
                            }
                            className={compactButtonClassName}
                          >
                            Otwórz w edytorze
                          </button>

                          <Link
                            to="/reports"
                            className={compactButtonClassName}
                          >
                            Raporty
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {error && !isUnauthorized ? (
                <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] p-3 text-sm text-rose-100">
                  {error.message}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <AddHallDialogAscii
        open={openAdd}
        loadingParent={loading}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: 2,
  }).format(value);
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

function MetricTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${toneClass(tone)}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-60">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-bold">{value}</div>
    </div>
  );
}

function HallBadge({ hasSections }: { hasSections: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${
        hasSections
          ? "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100"
          : "border-amber-400/25 bg-amber-400/[0.08] text-amber-100"
      }`}
    >
      {hasSections ? "Gotowa do edycji" : "Wymaga sekcji"}
    </span>
  );
}

function EmptyState({
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
}: {
  title: string;
  description: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-6 py-12 text-center">
      <div className="text-lg font-bold text-white">{title}</div>

      <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        {description}
      </div>

      <button
        type="button"
        onClick={onPrimaryAction}
        className="mt-5 rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-4 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
      >
        {primaryActionLabel}
      </button>
    </div>
  );
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
