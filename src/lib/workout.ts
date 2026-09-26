import { groupsForKeys, type Exercise } from "./explorer";
import type { Program, ProgramDay, SetKind, WorkoutEntry, WorkoutExercise, WorkoutSet } from "./types";

export const SET_KINDS: { id: SetKind; label: string; short: string; color: string; hint: string }[] = [
  { id: "warmup", label: "Warm-up", short: "W", color: "#8a919c", hint: "Doesn't count toward volume" },
  { id: "working", label: "Working", short: "", color: "#c6f432", hint: "Counts as 1 set" },
  { id: "backoff", label: "Back-off", short: "B", color: "#5aaeff", hint: "Lighter set after top sets. Counts as 1 set" },
];

/**
 * Intensity techniques that add fatigue on top of the set itself.
 * `value` is extra effective sets, so a working set with a drop set counts as 1.75.
 */
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

export function newExercise(exerciseId: string): WorkoutExercise {
  return {
    id: crypto.randomUUID(),
    exerciseId,
    notes: "",
    sets: [newSet("working", { reps: 10 }), newSet("working", { reps: 10 }), newSet("working", { reps: 10 })],
  };
}

export const newEntry = (exerciseId: string): WorkoutEntry => ({ id: crypto.randomUUID(), exercises: [newExercise(exerciseId)], restSec: 90 });

/** Effective sets for fatigue/volume: warm-ups are free, techniques add on top. */
export function setValue(s: WorkoutSet) {
  if (s.kind === "warmup") return 0;
  return 1 + s.modifiers.reduce((a, id) => a + (modifierById(id)?.value ?? 0), 0);
}

export const exerciseValue = (e: WorkoutExercise) => e.sets.reduce((a, s) => a + setValue(s), 0);
export const entryValue = (e: WorkoutEntry) => e.exercises.reduce((a, x) => a + exerciseValue(x), 0);
export const fmtSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ""));

/* ------------------------------------------------------------------ volume */

export interface GroupVolume {
  total: number;
  /** dayId → effective sets */
  byDay: Map<string, number>;
  /** exercise name → effective sets (this group only) */
  byExercise: Map<string, number>;
}

/** Effective sets per muscle group for the whole cycle. Secondary groups count half. */
export function programVolume(program: Program, exercises: Map<string, Exercise>, blockType: string | null) {
  const out = new Map<string, GroupVolume>();
  const add = (group: string, day: ProgramDay, name: string, v: number) => {
    if (!v) return;
    let g = out.get(group);
    if (!g) out.set(group, (g = { total: 0, byDay: new Map(), byExercise: new Map() }));
    g.total += v;
    g.byDay.set(day.id, (g.byDay.get(day.id) ?? 0) + v);
    g.byExercise.set(name, (g.byExercise.get(name) ?? 0) + v);
  };
  for (const day of program.days) {
    for (const block of day.blocks) {
      if (blockType && block.type !== blockType) continue;
      for (const entry of block.entries ?? []) {
        for (const we of entry.exercises) {
          const ex = exercises.get(we.exerciseId);
          if (!ex) continue;
          const v = exerciseValue(we);
          const primary = groupsForKeys(ex.primary);
          const secondary = groupsForKeys(ex.secondary).filter((g) => !primary.includes(g));
          primary.forEach((g) => add(g, day, ex.name, v));
          secondary.forEach((g) => add(g, day, ex.name, v * 0.5));
        }
      }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ heat colour */

/** Colour stops by weekly effective sets: very light green → green (5) → yellow (10–15) → red (20+). */
const STOPS: [number, [number, number, number]][] = [
  [0.5, [220, 252, 231]],
  [5, [74, 222, 128]],
  [10, [250, 204, 21]],
  [15, [251, 146, 60]],
  [20, [239, 68, 68]],
  [30, [185, 28, 28]],
];

export function heatColor(sets: number) {
  if (sets <= 0) return null;
  if (sets <= STOPS[0][0]) return `rgb(${STOPS[0][1].join(",")})`;
  for (let i = 1; i < STOPS.length; i++) {
    const [x1, c1] = STOPS[i];
    const [x0, c0] = STOPS[i - 1];
    if (sets <= x1) {
      const t = (sets - x0) / (x1 - x0);
      return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * t)).join(",")})`;
    }
  }
  return `rgb(${STOPS[STOPS.length - 1][1].join(",")})`;
}

export const HEAT_LEGEND = [0, 1, 5, 10, 15, 20, 30];

export function heatLabel(sets: number) {
  if (sets <= 0) return "Not trained";
  if (sets < 5) return "Light";
  if (sets < 10) return "Moderate";
  if (sets <= 20) return "High";
  return "Very high";
}

/* ------------------------------------------------------------------ summaries */

/** "2 warm-up · 3×8 @ 80 kg · 1 back-off" */
export function setSummary(sets: WorkoutSet[], fmtWeight: (kg: number) => string) {
  const warm = sets.filter((s) => s.kind === "warmup").length;
  const back = sets.filter((s) => s.kind === "backoff").length;
  const working = sets.filter((s) => s.kind === "working");
  const parts: string[] = [];
  if (warm) parts.push(`${warm} warm-up`);
  if (working.length) {
    const reps = [...new Set(working.map((s) => s.reps))];
    const weights = [...new Set(working.map((s) => s.weight))];
    let w = `${working.length}×${reps.length === 1 ? (reps[0] ?? "?") : `${Math.min(...reps.map((r) => r ?? 0))}–${Math.max(...reps.map((r) => r ?? 0))}`}`;
    if (weights.length === 1 && weights[0] != null) w += ` @ ${fmtWeight(weights[0])}`;
    parts.push(w);
  }
  if (back) parts.push(`${back} back-off`);
  return parts.join(" · ") || "No sets";
}

export const SUPERSET_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 45 → "45s", 90 → "1:30", 120 → "2 min" */
export function fmtRest(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}
