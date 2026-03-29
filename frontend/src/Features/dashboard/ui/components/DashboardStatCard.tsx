type Tone = "neutral" | "success" | "warning" | "danger";

type Props = {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
};

const hintClasses: Record<Tone, string> = {
  neutral: "text-slate-500",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
};

const cardClasses: Record<Tone, string> = {
  neutral: "border-slate-200 bg-white",
  success: "border-emerald-200 bg-emerald-50/40",
  warning: "border-amber-200 bg-amber-50/40",
  danger: "border-rose-200 bg-rose-50/40",
};

export function DashboardStatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: Props) {
  return (
    <div
      className={[
        "rounded-xl border p-4 shadow-sm",
        cardClasses[tone],
      ].join(" ")}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
      <p className={`mt-1 text-xs ${hintClasses[tone]}`}>{hint}</p>
    </div>
  );
}
