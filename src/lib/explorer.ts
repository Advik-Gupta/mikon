"use client";

import { useEffect, useMemo, useState } from "react";
import { KEYS, readStored, useStored, writeStored } from "./storage";
import bodyMap from "@/data/body-map.json";
import { FEDB_TO_GROUP, MUSCLE_GROUPS, MUSCLES, muscleById, type Muscle } from "@/data/muscles";

export interface Exercise {
  id: string;
  name: string;
  category: string;
  level: string;
  equipment: string;
  mechanic: string | null;
  force: string | null;
  /** free-exercise-db muscle keys */
  primary: string[];
  secondary: string[];
  instructions: string[];
  images: string[];
  discipline: "weights" | "calisthenics" | "plyometrics" | "cardio" | "mobility";
  /** Timed holds (planks, levers, stretches) vs reps */
  measure: "reps" | "time";
  /** Plyometrics only */
  intensity?: "low" | "moderate" | "high";
  /** Calisthenics progression family and position in it (1 = easiest) */
  family?: string;
  step?: number;
  source: "free-exercise-db" | "mikon" | "custom";
  /** Custom exercises: specific Mikon muscle ids the user said it targets */
  targets?: string[];
  createdAt?: string;
}

interface ExerciseDB {
  imageBase: string;
  exercises: Exercise[];
}

export type Sex = "male" | "female";
export type View = "front" | "back";

export interface Shape {
  d: string;
  m: string;
  s: "l" | "r";
  b: [number, number, number, number];
}

export interface FigureView {
  viewBox: [number, number, number, number];
  silhouette: string[];
  hair: string[];
  shapes: Shape[];
}

export const BODY = bodyMap as unknown as Record<Sex, Record<View, FigureView>>;

/** Muscles with at least one shape on each figure. The figures differ slightly by sex. */
export const DRAWN: Record<Sex, Set<string>> = {
  male: new Set((["front", "back"] as View[]).flatMap((v) => BODY.male[v].shapes.map((x) => x.m))),
  female: new Set((["front", "back"] as View[]).flatMap((v) => BODY.female[v].shapes.map((x) => x.m))),
};

/** Where a muscle shows on a figure: itself, or the drawn muscle it sits beneath or beside. */
export function displayMuscle(id: string, sex: Sex) {
  if (DRAWN[sex].has(id)) return id;
  const m = muscleById(id);
  return m?.beneath && DRAWN[sex].has(m.beneath) ? m.beneath : null;
}

/* ------------------------------------------------------------------ exercise data */

let cache: Promise<ExerciseDB> | null = null;
function loadDB() {
  cache ??= fetch("/data/exercises.json").then((r) => {
    if (!r.ok) throw new Error(`Failed to load exercises (${r.status})`);
    return r.json();
  });
  return cache;
}

/** The shared library plus the user's own exercises. Custom ones update live. */
export function useExerciseDB() {
  const [base, setBase] = useState<ExerciseDB | null>(null);
  const [error, setError] = useState<string | null>(null);
  const custom = useStored<Exercise[]>(KEYS.customExercises);
  useEffect(() => {
    let live = true;
    loadDB()
      .then((d) => live && setBase(d))
      .catch((e: Error) => {
        cache = null;
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  const db = useMemo(
    () => (base ? { ...base, exercises: [...(custom ?? []), ...base.exercises].sort((x, y) => x.name.localeCompare(y.name)) } : null),
    [base, custom],
  );
  return { db, error };
}

/* ------------------------------------------------------------------ custom exercises */

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Existing exercises whose name matches (exactly, or nearly) the proposed one. */
export function findSimilar(name: string, all: Exercise[], ignoreId?: string) {
  const n = normName(name);
  if (n.length < 3) return { exact: null as Exercise | null, similar: [] as Exercise[] };
  const others = all.filter((e) => e.id !== ignoreId);
  const exact = others.find((e) => normName(e.name) === n) ?? null;
  const words = n.split(" ").filter((w) => w.length > 2);
  const similar = exact
    ? []
    : others.filter((e) => {
        const en = normName(e.name);
        return words.length > 0 && words.every((w) => en.includes(w));
      }).slice(0, 5);
  return { exact, similar };
}

export function saveCustomExercise(ex: Exercise) {
  const list = readStored<Exercise[]>(KEYS.customExercises) ?? [];
  const exists = list.some((e) => e.id === ex.id);
  writeStored(KEYS.customExercises, exists ? list.map((e) => (e.id === ex.id ? ex : e)) : [ex, ...list]);
}

export function deleteCustomExercise(id: string) {
  writeStored(
    KEYS.customExercises,
    (readStored<Exercise[]>(KEYS.customExercises) ?? []).filter((e) => e.id !== id),
  );
}

export const imageUrl = (db: ExerciseDB, path: string) => db.imageBase + path;

/* ------------------------------------------------------------------ matching */

const rx = (src?: string) => (src ? new RegExp(src, "i") : null);
const regexCache = new Map<string, { emphasis: RegExp | null; exclude: RegExp | null }>();
function patterns(m: Muscle) {
  let p = regexCache.get(m.id);
  if (!p) {
    p = { emphasis: rx(m.exercises.emphasis), exclude: rx(m.exercises.exclude) };
    regexCache.set(m.id, p);
  }
  return p;
}

const hits = (m: Muscle, e: Exercise, which: "primary" | "any") =>
  m.exercises.fedb.some((k) => e.primary.includes(k) || (which === "any" && e.secondary.includes(k)));

export function emphasises(m: Muscle, e: Exercise) {
  if (e.targets?.length) return e.targets.includes(m.id);
  const { emphasis, exclude } = patterns(m);
  return !!emphasis && emphasis.test(e.name) && !exclude?.test(e.name) && hits(m, e, "any");
}

/** Exercises for a muscle: ones that bias it by name, then others where its region is a prime mover. */
export function exercisesForMuscle(m: Muscle, all: Exercise[]) {
  const emphasis: Exercise[] = [];
  const general: Exercise[] = [];
  for (const e of all) {
    if (e.category === "stretching") continue;
    if (emphasises(m, e)) emphasis.push(e);
    else if (hits(m, e, "primary")) general.push(e);
  }
  const primaryFirst = (a: Exercise, b: Exercise) => Number(hits(m, b, "primary")) - Number(hits(m, a, "primary"));
  return { emphasis: emphasis.sort(primaryFirst), general };
}

export function stretchesForMuscle(m: Muscle, all: Exercise[]) {
  return all.filter((e) => e.category === "stretching" && hits(m, e, "any"));
}

const GROUP_KEYS = Object.entries(FEDB_TO_GROUP).reduce<Record<string, string[]>>((acc, [k, g]) => {
  (acc[g] ??= []).push(k);
  return acc;
}, {});

export function exercisesForGroup(groupId: string, all: Exercise[]) {
  const keys = GROUP_KEYS[groupId] ?? [];
  return all.filter((e) => e.category !== "stretching" && e.primary.some((k) => keys.includes(k)));
}

/** Which Mikon muscles an exercise works, most specific first. */
export function musclesForExercise(e: Exercise) {
  const resolve = (keys: string[]) => {
    const out = new Set<string>();
    for (const k of keys) {
      const candidates = MUSCLES.filter((m) => m.exercises.fedb.includes(k) && FEDB_TO_GROUP[k] === m.group);
      const biased = candidates.filter((m) => emphasises(m, e));
      (biased.length ? biased : candidates.filter((m) => !m.deep)).forEach((m) => out.add(m.id));
    }
    return [...out];
  };
  const primary = resolve(e.primary);
  const secondary = resolve(e.secondary).filter((id) => !primary.includes(id));
  return { primary, secondary };
}

export const groupsForKeys = (keys: string[]) => [...new Set(keys.map((k) => FEDB_TO_GROUP[k]).filter(Boolean))];

/* ------------------------------------------------------------------ search */

const norm = (s: string) => s.toLowerCase().normalize("NFKD");

export function searchMuscles(q: string) {
  const n = norm(q.trim());
  if (!n) return [];
  return MUSCLES.filter((m) => [m.name, ...(m.aka ?? [])].some((s) => norm(s).includes(n)));
}

export function searchGroups(q: string) {
  const n = norm(q.trim());
  if (!n) return [];
  return MUSCLE_GROUPS.filter((g) => norm(g.name).includes(n));
}

export function searchExercises(q: string, all: Exercise[]) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return all.filter((e) => words.every((w) => norm(e.name).includes(w)));
}

export const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
