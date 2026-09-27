import type { Exercise } from "./explorer";
import type { SetKind, WorkoutEntry, WorkoutExercise, WorkoutSet } from "./types";

export const SET_KINDS: { id: SetKind; label: string; short: string; color: string; hint: string }[] = [
  { id: "warmup", label: "Warm-up", short: "W", color: "#8a919c", hint: "Doesn't count toward volume" },
  { id: "working", label: "Working", short: "", color: "#c6f432", hint: "Counts as 1 set" },
  { id: "backoff", label: "Back-off", short: "B", color: "#5aaeff", hint: "Lighter set after top sets. Counts as 1 set" },
];

export const SET_MODIFIERS: { id: string; label: string; value: number; hint: string }[] = [
  { id: "dropset", label: "Drop set", value: 0.75, hint: "Reduce the weight and continue straight away" },
  { id: "restpause", label: "Rest-pause", value: 0.75, hint: "Short rests of 10–20s for extra reps" },
  { id: "myoreps", label: "Myo-reps", value: 0.75, hint: "Activation set followed by mini-sets" },
  { id: "partials", label: "Partials", value: 0.5, hint: "Extra partial-range reps after failure" },
  { id: "forced", label: "Forced reps", value: 0.5, hint: "Spotter-assisted reps past failure" },
  { id: "negatives", label: "Negatives", value: 0.5, hint: "Slow or overloaded eccentrics" },
  { id: "failure", label: "To failure", value: 0.25, hint: "Taken to true muscular failure" },
];

export const modifierById = (id: string) => SET_MODIFIERS.find((m) => m.id === id);

export function newSet(kind: SetKind = "working", from?: Partial<WorkoutSet>): WorkoutSet {
  return { id: crypto.randomUUID(), kind, weight: null, reps: null, rpe: null, modifiers: [], ...from, ...(from ? { id: crypto.randomUUID() } : {}) };
}

export function defaultSets(ex?: Exercise): WorkoutSet[] {
  const make = (n: number, from: Partial<WorkoutSet>) => Array.from({ length: n }, () => newSet("working", from));
  if (!ex) return make(3, { reps: 10 });
  if (ex.discipline === "mobility") return make(2, { holdSec: 30 });
  if (ex.discipline === "plyometrics") return make(3, { reps: ex.intensity === "high" ? 4 : ex.intensity === "low" ? 10 : 6 });
  if (ex.measure === "time") return make(3, { holdSec: 20 });
  if (ex.discipline === "calisthenics") return make(3, { reps: 8 });
  return make(3, { reps: 10 });
}

export function newExercise(exerciseId: string, ex?: Exercise): WorkoutExercise {
  return { id: crypto.randomUUID(), exerciseId, notes: "", sets: defaultSets(ex) };
}

export const newEntry = (exerciseId: string, ex?: Exercise, restSec = 90): WorkoutEntry => ({
  id: crypto.randomUUID(),
  exercises: [newExercise(exerciseId, ex)],
  restSec,
});

export const hardSets = (sets: WorkoutSet[]) => sets.filter((s) => s.kind !== "warmup").length;
export const entryHardSets = (e: WorkoutEntry) => e.exercises.reduce((a, x) => a + hardSets(x.sets), 0);

export function setValue(s: WorkoutSet) {
  if (s.kind === "warmup") return 0;
  return 1 + s.modifiers.reduce((a, id) => a + (modifierById(id)?.value ?? 0), 0);
}

export const exerciseValue = (e: WorkoutExercise) => e.sets.reduce((a, s) => a + setValue(s), 0);
export const entryValue = (e: WorkoutEntry) => e.exercises.reduce((a, x) => a + exerciseValue(x), 0);
export const fmtSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));

export function setSummary(sets: WorkoutSet[], fmtWeight: (kg: number) => string, unit = "") {
  const warm = sets.filter((s) => s.kind === "warmup").length;
  const back = sets.filter((s) => s.kind === "backoff").length;
  const working = sets.filter((s) => s.kind === "working");
  const parts: string[] = [];
  if (warm) parts.push(`${warm} warm-up`);
  if (working.length) {
    const timed = working.some((s) => s.holdSec != null && s.reps == null);
    const vals = working.map((s) => (timed ? (s.holdSec ?? 0) : (s.reps ?? 0)));
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const amount = lo === hi ? `${lo || "?"}` : `${lo}–${hi}`;
    let w = `${working.length}×${amount}${timed ? "s" : unit}`;
    const weights = [...new Set(working.map((s) => s.weight))];
    if (weights.length === 1 && weights[0] != null) w += ` @ ${fmtWeight(weights[0])}`;
    parts.push(w);
  }
  if (back) parts.push(`${back} back-off`);
  return parts.join(" · ") || "No sets";
}

export const SUPERSET_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function fmtRest(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}
