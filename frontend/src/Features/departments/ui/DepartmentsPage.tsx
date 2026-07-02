import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toApiError, type ApiError } from "../../../shared/api/httpClient";
import { departmentsApi } from "../api/departmentsApi";
import type { DepartmentDto } from "../api/contracts";
import { AddDepartmentModal } from "./components/AddDepartmentModal";

type Tone = "slate" | "cyan" | "emerald" | "amber" | "rose" | "violet";

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  const loadDepartments = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const data = await departmentsApi.list({ includeInactive: true, signal });
      setDepartments(data ?? []);
    } catch (err) {
      if (signal?.aborted) return;

      setError(toApiError(err, "Nie udało się pobrać działów."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadDepartments(controller.signal);

    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => {
    const active = departments.filter((department) => department.isActive);
    const employees = departments.reduce(
      (sum, department) => sum + department.employeesCount,
      0,
    );

    const withValueStream = departments.filter((department) =>
      department.valueStream?.trim(),
    );

    return {
      activeCount: active.length,
      inactiveCount: departments.length - active.length,
      employeesCount: employees,
      withValueStreamCount: withValueStream.length,
    };
  }, [departments]);

  const sortedDepartments = useMemo(
    () =>
      [...departments].sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1;
        }

        return left.name.localeCompare(right.name, "pl");
      }),
    [departments],
  );

  const handleCreated = (department: DepartmentDto) => {
    setDepartments((prev) =>
      [department, ...prev].sort((a, b) => a.name.localeCompare(b.name, "pl")),
    );
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
                    Struktura organizacji
                  </span>

                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    {metrics.activeCount} aktywnych
                  </span>

                  {metrics.inactiveCount > 0 ? (
                    <span className="rounded-full border border-amber-400/25 bg-amber-400/[0.08] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      {metrics.inactiveCount} nieaktywnych
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-2 truncate text-xl font-bold tracking-tight text-white">
                  Działy
                </h1>

                <p className="mt-1 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-400">
                  Słownik działów wykorzystywany przez pracowników, Lean,
                  raporty i magazyn. Tu szybko sprawdzisz aktywność, liczbę osób
                  i powiązanie ze strumieniem wartości.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Link to="/employees" className={headerButtonClassName}>
                  Pracownicy
                </Link>

                <Link to="/lean" className={headerButtonClassName}>
                  Lean
                </Link>

                <button
                  type="button"
                  onClick={() => void loadDepartments()}
                  className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]"
                >
                  Odśwież
                </button>

                <button
                  type="button"
                  onClick={() => setOpenAdd(true)}
                  className="rounded-xl border border-emerald-400/35 bg-emerald-400/[0.12] px-3 py-2 text-sm font-bold text-emerald-100 transition hover:border-emerald-300/50 hover:bg-emerald-400/[0.16]"
                >
                  Dodaj dział
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Aktywne działy"
                value={String(metrics.activeCount)}
                hint={`Nieaktywne: ${metrics.inactiveCount}`}
                tone={metrics.activeCount > 0 ? "emerald" : "slate"}
              />

              <MetricCard
                label="Pracownicy"
                value={String(metrics.employeesCount)}
                hint="Suma przypisań do działów"
                tone="cyan"
              />

              <MetricCard
                label="Strumienie wartości"
                value={String(metrics.withValueStreamCount)}
                hint="Działy z uzupełnionym value stream"
                tone={metrics.withValueStreamCount > 0 ? "violet" : "slate"}
              />

              <MetricCard
                label="Wszystkie rekordy"
                value={String(departments.length)}
                hint="Master data organizacji"
                tone="slate"
              />
            </div>
          </section>

          {error ? <AlertBox tone="rose">{error.message}</AlertBox> : null}

          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/25">
            <div className="shrink-0 border-b border-slate-800 bg-slate-900/95 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-200">
                    Lista działów
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Aktywne działy są pokazane wyżej, aby łatwiej utrzymać
                    porządek w danych organizacyjnych.
                  </p>
                </div>

                <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs font-semibold text-slate-300">
                  {sortedDepartments.length}
                </span>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {loading ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">
                  Ładowanie działów...
                </div>
              ) : null}

              {!loading && !error && departments.length === 0 ? (
                <EmptyState text="Brak działów. Dodaj pierwszy obszar organizacji, aby porządkować pracowników i usprawnienia." />
              ) : null}

              {!loading && !error && departments.length > 0 ? (
                <div className="space-y-2">
                  {sortedDepartments.map((department) => (
                    <DepartmentRow
                      key={department.id}
                      department={department}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <AddDepartmentModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

function DepartmentRow({ department }: { department: DepartmentDto }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_0.65fr_0.9fr_0.55fr_0.65fr_1fr]">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-semibold text-white">
            {department.name}
          </div>

          <div className="mt-1 line-clamp-2 text-xs text-slate-500">
            {department.description?.trim() || "Brak opisu"}
          </div>
        </div>

        <InfoCell label="Kod" value={department.code || "-"} />

        <InfoCell
          label="Strumień wartości"
          value={department.valueStream ?? "-"}
        />

        <InfoCell
          label="Pracownicy"
          value={String(department.employeesCount)}
        />

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Status
          </div>

          <Badge tone={department.isActive ? "emerald" : "slate"}>
            {department.isActive ? "Aktywny" : "Nieaktywny"}
          </Badge>
        </div>

        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Akcje
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/employees" className={primaryCompactButtonClassName}>
              Pracownicy
            </Link>

            <Link to="/lean" className={compactButtonClassName}>
              Usprawnienia
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

function MetricCard({
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

const headerButtonClassName =
  "rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const compactButtonClassName =
  "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800";

const primaryCompactButtonClassName =
  "rounded-lg border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-400/[0.12]";
