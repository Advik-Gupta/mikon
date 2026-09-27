import type { BusyBlock, Profile } from "./types";

export const DAY_MIN = 24 * 60;
export const SNAP = 30;
const SLOT = 15;

export const snap = (min: number, step = SNAP) => Math.round(min / step) * step;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function fmtTime(min: number, compact = false) {
  const m = ((min % DAY_MIN) + DAY_MIN) % DAY_MIN;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (compact && mm === 0) return `${h12}${suffix}`;
  return `${h12}:${String(mm).padStart(2, "0")}${compact ? "" : " "}${suffix}`;
}

export const fmtRange = (b: Pick<BusyBlock, "start" | "end">) => `${fmtTime(b.start, true)} – ${fmtTime(b.end, true)}`;

export function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function isAsleep(min: number, wake: number, sleep: number) {
  return sleep > wake ? min < wake || min >= sleep : min >= sleep && min < wake;
}

export function freeMinutesByDay(s: Profile["schedule"]) {
  return Array.from({ length: 7 }, (_, day) => {
    let free = 0;
    for (let t = 0; t < DAY_MIN; t += SLOT) {
      if (isAsleep(t, s.wakeMin, s.sleepMin)) continue;
      const busy = s.blocks.some((b) => b.days.includes(day) && t >= b.start && t < b.end);
      if (!busy) free += SLOT;
    }
    return free;
  });
}

export function daysLabel(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b).join(",");
  if (sorted === "0,1,2,3,4") return "Weekdays";
  if (sorted === "5,6") return "Weekends";
  if (sorted === "0,1,2,3,4,5,6") return "Every day";
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return [...days].sort((a, b) => a - b).map((d) => names[d]).join(", ");
}

export const TIME_OPTIONS = Array.from({ length: DAY_MIN / SNAP + 1 }, (_, i) => i * SNAP);
