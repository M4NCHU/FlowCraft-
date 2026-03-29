type Tone = "neutral" | "info" | "success" | "warning" | "danger";

type Props = {
  label: string;
  tone?: Tone;
  className?: string;
};

const toneClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export function OperationalStatusBadge({
  label,
  tone = "neutral",
  className = "",
}: Props) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        toneClasses[tone],
        className,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
