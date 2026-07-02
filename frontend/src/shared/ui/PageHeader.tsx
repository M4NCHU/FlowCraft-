import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  extra?: ReactNode;
  meta?: ReactNode;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  extra,
  meta,
}: Props) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5 backdrop-blur sm:p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-400/0 via-sky-400/70 to-cyan-400/0" />
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </p>
          ) : null}
          {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
        </div>

        {extra ? (
          <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
            {extra}
          </div>
        ) : null}
      </div>
    </section>
  );
}
