import { busyCategory, WEEKDAYS } from "@/lib/options";
import { DAY_MIN, fmtDuration, freeMinutesByDay } from "@/lib/schedule";
import type { Profile } from "@/lib/types";

/** Read-only week overview: commitments per day plus free waking time. */
export function WeekMini({ schedule: s, height = 150 }: { schedule: Profile["schedule"]; height?: number }) {
  const free = freeMinutesByDay(s);
  const px = height / DAY_MIN;
  const sleepBands =
    s.sleepMin > s.wakeMin
      ? [
          [0, s.wakeMin],
          [s.sleepMin, DAY_MIN],
        ]
      : [[s.sleepMin, s.wakeMin]];

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((d, day) => (
        <div key={d} className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] text-faint">{d[0]}</span>
          <div className="relative w-full overflow-hidden rounded-md bg-surface-2" style={{ height }}>
            {sleepBands.map(([a, b]) => (
              <div key={a} className="absolute inset-x-0 bg-bg/70" style={{ top: a * px, height: (b - a) * px }} />
            ))}
            {s.blocks
              .filter((b) => b.days.includes(day))
              .map((b) => (
                <div
                  key={b.id}
                  className="absolute inset-x-0.5 rounded-sm"
                  style={{ top: b.start * px, height: Math.max(2, (b.end - b.start) * px), background: busyCategory(b.category).color }}
                />
              ))}
          </div>
          <span className="text-[10px] tabular-nums text-muted">{fmtDuration(free[day]).replace(/ \d+m$/, "")}</span>
        </div>
      ))}
    </div>
  );
}
