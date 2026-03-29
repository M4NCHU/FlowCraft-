import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ApiError } from "../../../shared/api/httpClient";
import type { HallDetailsResponse } from "../api/contracts";
import { useHallsList } from "../model/useHallsList";
import {
  HallsFilters,
  type HallsSortKey,
  type SortDir,
} from "./components/HallsFilters";
import { AddHallDialogAscii } from "./AddHallDialogAscii";

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

  const isUnauthorized = error instanceof ApiError && error.status === 401;

  const handleCreated = async (created: HallDetailsResponse) => {
    setOpenAdd(false);
    await reload();
    navigate(`/editor?hallId=${created.id}`);
  };

  return (
    <>
      <PageHeader
        title="Hale"
        extra={
          <div className="flex items-center gap-3">
            <HallsFilters
              q={query}
              onQChange={setQuery}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              dir={dir}
              onToggleDir={() => setDir((value) => (value === "asc" ? "desc" : "asc"))}
              onReset={reset}
              disabled={loading}
            />

            <button
              onClick={reload}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              disabled={loading}
            >
              Odśwież
            </button>

            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              disabled={loading}
            >
              Dodaj halę
            </button>

            <button
              onClick={() => navigate("/editor")}
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Edytor layoutu
            </button>
            <Link
              to="/projects"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Projekty
            </Link>
          </div>
        }
      />

      {isUnauthorized ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Sesja wygasła lub brak autoryzacji.
          <button
            className="ml-3 rounded-md border border-amber-200 bg-white px-3 py-1 text-xs hover:bg-amber-100"
            onClick={() => navigate("/login")}
          >
            Zaloguj się
          </button>
        </div>
      ) : null}

      <div className="rounded-xl bg-white p-4 shadow">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Ładowanie...
          </div>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Brak wyników.
          </div>
        ) : null}

        {!loading && filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((hall) => (
              <div
                key={hall.id}
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-900">
                      {hall.name}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                        Kod: <span className="text-slate-700">{hall.code}</span>
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                        Sekcje:{" "}
                        <span className="text-slate-700">{hall.sectionsCount}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      Powierzchnia
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {formatNumber(hall.areaSqMeters)} m²
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/editor?hallId=${hall.id}`}
                    className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    Edytuj layout
                  </Link>
                  <Link
                    to="/projects"
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Powiązane projekty
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {error && !isUnauthorized ? (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {error.message}
          </div>
        ) : null}
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
