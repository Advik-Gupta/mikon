import type { Exercise } from "@/lib/explorer";
import { bestValue, metricFor, metricFormat } from "@/lib/metrics";
import { fmtClock, workoutStats } from "@/lib/tracker";
import type { LoggedExercise, WorkoutLog } from "@/lib/types";
import type { ShareContent } from "./ShareStudio";

const origin = () => (typeof window === "undefined" ? "" : window.location.origin);
const kg = (v: number, units: "metric" | "imperial") => (units === "metric" ? `${Math.round(v * 10) / 10} kg` : `${Math.round(v * 2.20462)} lb`);
const big = (v: number, units: "metric" | "imperial") => {
  const n = units === "metric" ? v : v * 2.20462;
  return n >= 10000
    ? `${Math.round(n / 100) / 10}k ${units === "metric" ? "kg" : "lb"}`
    : `${Math.round(n).toLocaleString()} ${units === "metric" ? "kg" : "lb"}`;
};

export function workoutShare(
  log: WorkoutLog,
  exercises: Map<string, Exercise>,
  units: "metric" | "imperial",
  prs: LoggedExercise[],
  username?: string,
): ShareContent {
  const st = workoutStats(log);
  const date = new Date(log.startedAt ?? `${log.date}T12:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  return {
    kind: "workout",
    eyebrow: "Workout complete",
    title: log.name || "Workout",
    subtitle: date,
    stats: [
      { label: "Duration", value: log.durationSec ? fmtClock(log.durationSec * 1000) : "-" },
      { label: "Volume", value: big(st.volume, units) },
      { label: "Sets", value: String(st.sets) },
    ],
    blocks: [
      {
        title: "Personal bests",
        star: true,
        items: prs.map((x) => {
          const m = metricFor(x.sets);
          return { left: exercises.get(x.exerciseId)?.name ?? "Exercise", right: metricFormat(m, units)(bestValue(x.sets, m) ?? 0) };
        }),
      },
      {
        title: "Exercises",
        items: log.exercises.map((x) => {
          const done = x.sets.filter((s) => s.done && s.kind !== "warmup");
          const top = [...done].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
          const right = top
            ? `${done.length} × ${top.weight ? `${kg(top.weight, units)} × ` : ""}${top.holdSec != null && top.reps == null ? `${top.holdSec}s` : (top.reps ?? 0)}`
            : "";
          return { left: exercises.get(x.exerciseId)?.name ?? "Exercise", right };
        }),
      },
    ],
    cta: "Train with me on Mikon",
    url: username ? `${origin()}/signup?ref=${username}` : origin(),
    fileName: "mikon-workout.png",
  };
}

export function profileShare(p: {
  name: string;
  username: string;
  avatarUrl: string | null;
  workouts: number;
  streak: number;
  volume: number;
  friends: number | null;
  units: "metric" | "imperial";
  logs: WorkoutLog[];
  exercises: Map<string, Exercise>;
  split: { left: string; right: string }[];
}): ShareContent {
  const best = new Map<string, number>();
  for (const l of p.logs)
    for (const x of l.exercises) {
      const v = bestValue(x.sets, "e1rm");
      if (v != null && v > (best.get(x.exerciseId) ?? 0)) best.set(x.exerciseId, v);
    }
  const lifts = [...best.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, v]) => ({ left: p.exercises.get(id)?.name ?? "Exercise", right: `${kg(v, p.units)} e1RM` }));
  const recent = [...p.logs]
    .sort((a, b) => (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date))
    .slice(0, 4)
    .map((l) => ({
      left: l.name || "Workout",
      right: `${new Date(`${l.date}T12:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${workoutStats(l).sets} sets`,
    }));
  return {
    kind: "profile",
    eyebrow: "Find me on Mikon",
    title: p.name,
    subtitle: `@${p.username}`,
    stats: [
      { label: "Workouts", value: String(p.workouts) },
      { label: "Week streak", value: String(p.streak) },
      { label: "Lifted", value: big(p.volume, p.units) },
    ],
    blocks: [
      { title: "Best lifts", star: true, items: lifts },
      { title: "Current split", items: p.split },
      { title: "Recent workouts", items: recent },
    ],
    avatarUrl: p.avatarUrl,
    initials: p.name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase(),
    cta: "Add me as a friend on Mikon",
    apps: true,
    url: `${origin()}/signup?ref=${p.username}`,
    fileName: `mikon-${p.username}.png`,
  };
}
