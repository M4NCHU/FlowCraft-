import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { pl } from "date-fns/locale";
import {
  MaintenanceOccurrenceStatus,
  type MaintenanceCalendarOccurrenceDto,
} from "../../api/contracts";

type Props = {
  month: Date;
  occurrences: MaintenanceCalendarOccurrenceDto[];
  onSelectOccurrence: (occurrence: MaintenanceCalendarOccurrenceDto) => void;
  onSelectDay: (day: Date) => void;
};

const weekdayLabels = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

const occurrenceClassNames: Record<MaintenanceOccurrenceStatus, string> = {
  [MaintenanceOccurrenceStatus.Upcoming]:
    "border-slate-200 bg-slate-50 text-slate-700",
  [MaintenanceOccurrenceStatus.DueSoon]:
    "border-amber-200 bg-amber-50 text-amber-800",
  [MaintenanceOccurrenceStatus.Overdue]:
    "border-rose-200 bg-rose-50 text-rose-700",
  [MaintenanceOccurrenceStatus.Completed]:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  [MaintenanceOccurrenceStatus.Inactive]:
    "border-slate-200 bg-slate-100 text-slate-500",
};

export function MaintenanceCalendar({
  month,
  occurrences,
  onSelectOccurrence,
  onSelectDay,
}: Props) {
  const firstDay = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const lastDay = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: firstDay, end: lastDay });

  const occurrencesByDay = occurrences.reduce<
    Record<string, MaintenanceCalendarOccurrenceDto[]>
  >((acc, occurrence) => {
    const key = format(new Date(occurrence.scheduledForUtc), "yyyy-MM-dd");
    acc[key] = [...(acc[key] ?? []), occurrence].sort(
      (a, b) =>
        Date.parse(a.scheduledForUtc) - Date.parse(b.scheduledForUtc) ||
        a.planTitle.localeCompare(b.planTitle, "pl")
    );
    return acc;
  }, {});

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayOccurrences = occurrencesByDay[key] ?? [];
          const inMonth = isSameMonth(day, month);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(day)}
              className={[
                "min-h-36 border-b border-r border-slate-200 p-2 text-left align-top transition-colors hover:bg-slate-50",
                !inMonth ? "bg-slate-50/70" : "bg-white",
              ].join(" ")}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={[
                    "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                    inMonth ? "text-slate-900" : "text-slate-400",
                  ].join(" ")}
                >
                  {format(day, "d")}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">
                  {format(day, "LLL", { locale: pl })}
                </span>
              </div>

              <div className="space-y-1.5">
                {dayOccurrences.slice(0, 3).map((occurrence) => (
                  <div
                    key={`${occurrence.planId}-${occurrence.scheduledForUtc}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectOccurrence(occurrence);
                    }}
                    className={[
                      "rounded-lg border px-2 py-1.5 text-xs",
                      occurrenceClassNames[occurrence.status],
                    ].join(" ")}
                  >
                    <div className="truncate font-medium">{occurrence.planTitle}</div>
                    <div className="truncate opacity-80">{occurrence.assetName}</div>
                    <div className="opacity-70">
                      {format(new Date(occurrence.scheduledForUtc), "HH:mm")}
                    </div>
                  </div>
                ))}

                {dayOccurrences.length > 3 ? (
                  <div className="px-1 text-[11px] text-slate-500">
                    +{dayOccurrences.length - 3} więcej
                  </div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
