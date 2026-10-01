import type { Exercise } from "../explorer";
import { metricById, type Measurement } from "../measurements";
import type { WorkoutLog } from "../types";

const q = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const stamp = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const duration = (sec?: number) => {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

export function workoutsCsv(logs: WorkoutLog[], exercises: Map<string, Exercise>) {
  const rows = [["Date", "Workout Name", "Duration", "Exercise Name", "Set Order", "Weight", "Reps", "Distance", "Seconds", "Notes", "Workout Notes", "RPE"]];
  const sorted = [...logs].filter((l) => l.completedAt).sort((a, b) => (a.startedAt ?? a.date).localeCompare(b.startedAt ?? b.date));
  for (const l of sorted) {
    let first = true;
    for (const x of l.exercises) {
      let n = 0;
      x.sets.forEach((s, i) => {
        if (!s.done) return;
        const order = s.kind === "warmup" ? "W" : s.rir === 0 ? "F" : String(++n);
        rows.push([
          stamp(l.startedAt ?? `${l.date}T12:00`),
          l.name || "Workout",
          duration(l.durationSec),
          exercises.get(x.exerciseId)?.name ?? x.exerciseId,
          order,
          String(s.weight ?? 0),
          String(s.reps ?? 0),
          String(s.distanceKm ?? 0),
          String(s.holdSec ?? 0),
          i === 0 ? (x.note ?? "") : "",
          first ? l.notes : "",
          s.rir != null ? String(10 - s.rir) : "",
        ]);
        first = false;
      });
    }
  }
  return rows.map((r) => r.map(q).join(",")).join("\n");
}

export function measurementsCsv(list: Measurement[]) {
  const unit: Record<string, string> = { mass: "kg", percent: "%", energy: "kcal", length: "cm" };
  const rows = [["Date", "Measurement Type", "Value", "Unit", "Source"]];
  for (const m of [...list].sort((a, b) => b.date.localeCompare(a.date))) {
    const def = metricById(m.metric);
    if (def) rows.push([stamp(m.date), def.label, String(m.value), unit[def.kind], "Mikon"]);
  }
  return rows.map((r) => r.map(q).join(",")).join("\n");
}

export function downloadText(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
