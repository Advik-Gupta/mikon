"use client";

import { useEffect, useState } from "react";
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

export function useExerciseDB() {
  const [db, setDb] = useState<ExerciseDB | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadDB()
      .then((d) => live && setDb(d))
      .catch((e: Error) => {
        cache = null;
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  return { db, error };
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
