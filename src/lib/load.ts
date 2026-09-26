import { cardioModality, cardioType, DIRECT_SHARE, EDITOR_KIND, PLYO_INTENSITY, sessionActivity, ZONES } from "@/data/activities";
import { blockType } from "./options";
import { groupsForKeys, musclesForExercise, type Exercise } from "./explorer";
import { MUSCLE_GROUPS, muscleById } from "@/data/muscles";
import type { CardioSegment, Program, ProgramBlock, WorkoutExercise } from "./types";
import { exerciseValue, setValue } from "./workout";

/**
 * Training load, in "set equivalents" per muscle group.
 *
 * - direct: work where the group is a prime mover. This is what the UI shows as "sets".
 * - indirect: stabilising / secondary work. It only tints the figure and adds to fatigue.
 *
 * Fatigue blends the two (indirect at INDIRECT_WEIGHT) and, per day, carries over from the
 * previous days with a decay, so back-to-back sessions on the same muscle read as hot.
 */

export const INDIRECT_WEIGHT = 0.35;
/** Direct sets on one day after which the muscle needs a gap day before it's trained again. */
export const GAP_DAY_THRESHOLD = 6;
/** Carry-over of fatigue from 1, 2 and 3 days earlier */
const CARRY = [0.6, 0.3, 0.1];

export interface GroupLoad {
  direct: number;
  indirect: number;
  /** label (exercise or session) → direct set equivalents */
  sources: Map<string, { direct: number; indirect: number; type: string }>;
  /** block type → direct set equivalents */
  byType: Map<string, number>;
}

export type DayLoad = Map<string, GroupLoad>;

function add(day: DayLoad, group: string, direct: number, indirect: number, label: string, type: string) {
  if (!direct && !indirect) return;
  let g = day.get(group);
  if (!g) day.set(group, (g = { direct: 0, indirect: 0, sources: new Map(), byType: new Map() }));
  g.direct += direct;
  g.indirect += indirect;
  const s = g.sources.get(label) ?? { direct: 0, indirect: 0, type };
  s.direct += direct;
  s.indirect += indirect;
  g.sources.set(label, s);
  if (direct) g.byType.set(type, (g.byType.get(type) ?? 0) + direct);
}

/* ------------------------------------------------------------------ cardio helpers */

export function segmentMinutes(s: CardioSegment) {
  const mod = cardioModality(s.modality);
  const speed = mod.speed[s.zone - 1] || mod.speed[1];
  if (s.kind === "steady") {
    if (s.durationMin) return s.durationMin;
    if (s.distanceKm && speed) return s.distanceKm / speed;
    return 0;
  }
  const reps = s.reps ?? 0;
  const work = s.workSec ? s.workSec / 60 : s.workDistanceM && speed ? s.workDistanceM / 1000 / speed : 0;
  const rest = (s.restSec ?? 0) / 60;
  return reps * work + Math.max(0, reps - 1) * rest;
}

export function segmentDistanceKm(s: CardioSegment) {
  const speed = cardioModality(s.modality).speed[s.zone - 1];
  if (s.kind === "steady") return s.distanceKm ?? (s.durationMin && speed ? s.durationMin * speed : 0);
  const reps = s.reps ?? 0;
  const work = s.workDistanceM ? s.workDistanceM / 1000 : s.workSec && speed ? (s.workSec / 60) * speed : 0;
  return reps * work;
}

/** Load of one cardio segment; interval rest counts as very easy work. */
export function segmentLoad(s: CardioSegment) {
  const mod = cardioModality(s.modality);
  const factor = ZONES[s.zone - 1]?.factor ?? 1;
  if (s.kind === "steady") return segmentMinutes(s) * mod.rate * factor;
  const reps = s.reps ?? 0;
  const speed = mod.speed[s.zone - 1];
  const workMin = s.workSec ? s.workSec / 60 : s.workDistanceM && speed ? s.workDistanceM / 1000 / speed : 0;
  const restMin = (Math.max(0, reps - 1) * (s.restSec ?? 0)) / 60;
  return (reps * workMin * factor + restMin * ZONES[0].factor * 0.5) * mod.rate;
}

export function segmentLabel(s: CardioSegment) {
  const mod = cardioModality(s.modality);
  const t = cardioType(s.type);
  if (s.kind === "intervals") {
    const work = s.workDistanceM ? `${s.workDistanceM >= 1000 ? `${s.workDistanceM / 1000} km` : `${s.workDistanceM} m`}` : `${s.workSec ?? 0}s`;
    return `${mod.label} · ${s.reps ?? 0}×${work} ${t.label.toLowerCase()}`;
  }
  return `${mod.label} · ${t.label.toLowerCase()} ${Math.round(segmentMinutes(s))} min`;
}

/* ------------------------------------------------------------------ block load */

/** Set equivalents for one exercise in a workout. */
export function exerciseLoad(ex: Exercise, we: WorkoutExercise) {
  if (ex.discipline === "mobility") return 0;
  if (ex.discipline === "plyometrics") {
    const f = PLYO_INTENSITY[ex.intensity ?? "moderate"].factor;
    return we.sets.reduce((a, s) => (s.kind === "warmup" ? a : a + (f * Math.min(1.5, Math.max(0.5, (s.reps ?? 6) / 6)) + setValue(s) - 1)), 0);
  }
  return exerciseValue(we);
}

export function addBlockLoad(day: DayLoad, block: ProgramBlock, exercises: Map<string, Exercise>) {
  const kind = EDITOR_KIND[block.type];
  const type = block.type;

  if (kind === "cardio") {
    for (const seg of block.cardio ?? []) {
      const se = segmentLoad(seg);
      const label = segmentLabel(seg);
      for (const [g, w] of Object.entries(cardioModality(seg.modality).muscles)) {
        if (w >= DIRECT_SHARE) add(day, g, se * w, 0, label, type);
        else add(day, g, 0, se * w, label, type);
      }
    }
    return;
  }

  if (kind === "session") {
    const s = block.session;
    if (!s?.durationMin) return;
    const act = sessionActivity(s.activity);
    const se = s.durationMin * act.rate * (s.rpe / 7);
    const label = `${act.label} · ${s.durationMin} min`;
    for (const [g, w] of Object.entries(act.muscles)) {
      if (w >= DIRECT_SHARE) add(day, g, se * w, 0, label, type);
      else add(day, g, 0, se * w, label, type);
    }
    return;
  }

  if (kind === "mobility") return; // stretching doesn't add fatigue

  for (const entry of block.entries ?? []) {
    for (const we of entry.exercises) {
      const ex = exercises.get(we.exerciseId);
      if (!ex) continue;
      const v = exerciseLoad(ex, we);
      const primary = groupsForKeys(ex.primary);
      const secondary = groupsForKeys(ex.secondary).filter((g) => !primary.includes(g));
      primary.forEach((g) => add(day, g, v, 0, ex.name, type));
      secondary.forEach((g) => add(day, g, 0, v, ex.name, type));
    }
  }
}

/** Load per day of the cycle, optionally for one activity type only. */
export function cycleLoads(program: Program, exercises: Map<string, Exercise>, onlyType: string | null): DayLoad[] {
  return program.days.map((d) => {
    const day: DayLoad = new Map();
    d.blocks.forEach((b) => (!onlyType || b.type === onlyType) && addBlockLoad(day, b, exercises));
    return day;
  });
}

export const fatigueOf = (g?: GroupLoad) => (g ? g.direct + INDIRECT_WEIGHT * g.indirect : 0);

/** Sum of every day in the cycle. */
export function cycleTotals(days: DayLoad[]): DayLoad {
  const out: DayLoad = new Map();
  days.forEach((day) =>
    day.forEach((g, group) => g.sources.forEach((s, label) => add(out, group, s.direct, s.indirect, label, s.type))),
  );
  return out;
}

/* ------------------------------------------------------------------ day readiness */

export type DayState = "fresh" | "light" | "moderate" | "high" | "recovering" | "conflict";

export interface DayStatus {
  state: DayState;
  /** Carry-over-weighted fatigue for colouring. Never shown to the user. */
  score: number;
  today?: GroupLoad;
  prevIndex: number;
  prevDirect: number;
  nextIndex: number;
  nextDirect: number;
  /** Same-day stacking across different activities, e.g. long run + leg day */
  stacked: string[];
}

export function dayStatuses(days: DayLoad[], index: number): Map<string, DayStatus> {
  const n = days.length;
  const at = (k: number) => days[((index + k) % n + n) % n];
  const groups = new Set(days.flatMap((d) => [...d.keys()]));
  const out = new Map<string, DayStatus>();

  for (const g of groups) {
    const today = days[index].get(g);
    const prev = n > 1 ? at(-1).get(g) : undefined;
    const next = n > 1 ? at(1).get(g) : undefined;
    let score = fatigueOf(today);
    for (let k = 1; k <= Math.min(3, n - 1); k++) score += CARRY[k - 1] * fatigueOf(at(-k).get(g));

    const td = today?.direct ?? 0;
    const pd = prev?.direct ?? 0;
    const nd = next?.direct ?? 0;
    const conflict = (pd >= GAP_DAY_THRESHOLD && td >= 1) || (td >= GAP_DAY_THRESHOLD && nd >= 1);
    const recovering = pd >= GAP_DAY_THRESHOLD && td < 1;
    const stacked = today ? [...today.byType.entries()].filter(([, v]) => v >= 3).map(([t]) => blockType(t).label) : [];

    const state: DayState = conflict
      ? "conflict"
      : recovering
        ? "recovering"
        : score >= 9
          ? "high"
          : score >= 4
            ? "moderate"
            : score > 0.2
              ? "light"
              : "fresh";

    out.set(g, {
      state,
      score,
      today,
      prevIndex: (index - 1 + n) % n,
      prevDirect: pd,
      nextIndex: (index + 1) % n,
      nextDirect: nd,
      stacked: stacked.length > 1 ? stacked : [],
    });
  }
  return out;
}

/* ------------------------------------------------------------------ colour */

type RGB = [number, number, number];
const ramp = (stops: [number, RGB][]) => (v: number) => {
  if (v <= 0.15) return null;
  if (v <= stops[0][0]) return `rgb(${stops[0][1].join(",")})`;
  for (let i = 1; i < stops.length; i++) {
    const [x1, c1] = stops[i];
    const [x0, c0] = stops[i - 1];
    if (v <= x1) {
      const t = (v - x0) / (x1 - x0);
      return `rgb(${c0.map((c, k) => Math.round(c + (c1[k] - c) * t)).join(",")})`;
    }
  }
  return `rgb(${stops[stops.length - 1][1].join(",")})`;
};

const LIGHT: RGB = [220, 252, 231];
const GREEN: RGB = [74, 222, 128];
const YELLOW: RGB = [250, 204, 21];
const ORANGE: RGB = [251, 146, 60];
const RED: RGB = [239, 68, 68];
const DEEP: RGB = [185, 28, 28];

/** Whole-cycle volume: light green from ~1 set, green 5, yellow 10–15, red 20+. */
export const cycleColor = ramp([
  [0.5, LIGHT],
  [5, GREEN],
  [10, YELLOW],
  [15, ORANGE],
  [20, RED],
  [30, DEEP],
]);

/** One day, including carry-over from the previous days. */
export const dayColor = ramp([
  [0.5, LIGHT],
  [3, GREEN],
  [6, YELLOW],
  [9, ORANGE],
  [12, RED],
  [16, DEEP],
]);

export const CYCLE_LEGEND = [0, 1, 5, 10, 15, 20, 30];
export const DAY_LEGEND = [0, 1, 3, 6, 9, 12, 16];

export const STATE_LABEL: Record<DayState, string> = {
  fresh: "Fresh",
  light: "Light load",
  moderate: "Moderate load",
  high: "High load",
  recovering: "Still recovering",
  conflict: "Needs a gap day",
};

/** Whole sets for display. Fractions are for the maths, not the user. */
export const shownSets = (v: number) => Math.round(v);

/* ------------------------------------------------------------------ muscle-level usage */

export interface UsageSource {
  dayIndex: number;
  label: string;
  type: string;
  direct: number;
  indirect: number;
}

export interface Usage {
  direct: number;
  indirect: number;
  /** Direct set equivalents per day of the cycle */
  byDay: number[];
  sources: UsageSource[];
}

const emptyUsage = (n: number): Usage => ({ direct: 0, indirect: 0, byDay: Array(n).fill(0), sources: [] });

/**
 * Per-muscle usage over the cycle. Exercises credit the specific muscles they bias
 * (e.g. lateral raises → lateral delt); cardio and sessions spread across the group.
 */
export function muscleUsage(program: Program, exercises: Map<string, Exercise>, onlyType: string | null) {
  const n = program.days.length;
  const out = new Map<string, Usage>();
  const credit = (muscle: string, dayIndex: number, label: string, type: string, direct: number, indirect: number) => {
    if (!direct && !indirect) return;
    let u = out.get(muscle);
    if (!u) out.set(muscle, (u = emptyUsage(n)));
    u.direct += direct;
    u.indirect += indirect;
    u.byDay[dayIndex] += direct;
    const src = u.sources.find((s) => s.dayIndex === dayIndex && s.label === label);
    if (src) {
      src.direct += direct;
      src.indirect += indirect;
    } else u.sources.push({ dayIndex, label, type, direct, indirect });
  };
  const spread = (group: string, share: number, se: number, dayIndex: number, label: string, type: string) => {
    const muscles = MUSCLE_GROUPS.find((g) => g.id === group)?.muscles.filter((m) => !muscleById(m)?.deep) ?? [];
    muscles.forEach((m) => (share >= DIRECT_SHARE ? credit(m, dayIndex, label, type, se * share, 0) : credit(m, dayIndex, label, type, 0, se * share)));
  };

  program.days.forEach((day, dayIndex) => {
    for (const block of day.blocks) {
      if (onlyType && block.type !== onlyType) continue;
      const kind = EDITOR_KIND[block.type];
      if (kind === "cardio") {
        for (const seg of block.cardio ?? []) {
          const se = segmentLoad(seg);
          Object.entries(cardioModality(seg.modality).muscles).forEach(([g, w]) => spread(g, w, se, dayIndex, segmentLabel(seg), block.type));
        }
      } else if (kind === "session") {
        const s = block.session;
        if (!s?.durationMin) continue;
        const act = sessionActivity(s.activity);
        const se = s.durationMin * act.rate * (s.rpe / 7);
        Object.entries(act.muscles).forEach(([g, w]) => spread(g, w, se, dayIndex, `${act.label} · ${s.durationMin} min`, block.type));
      } else {
        for (const entry of block.entries ?? []) {
          for (const we of entry.exercises) {
            const ex = exercises.get(we.exerciseId);
            if (!ex) continue;
            const v = exerciseLoad(ex, we);
            const worked = musclesForExercise(ex);
            worked.primary.forEach((m) => credit(m, dayIndex, ex.name, block.type, v, 0));
            worked.secondary.forEach((m) => credit(m, dayIndex, ex.name, block.type, 0, v));
          }
        }
      }
    }
  });
  return out;
}

/** Days in the cycle with at least one direct set. */
export const frequency = (byDay: number[]) => byDay.filter((v) => v >= 1).length;

/** Scale a per-cycle number to per-week, so targets read the same for any cycle length. */
export const perWeek = (value: number, cycleDays: number) => (cycleDays ? (value * 7) / cycleDays : value);
