"use client";

import { useEffect, useMemo, useRef } from "react";
import { groupById } from "@/data/muscles";
import { toast } from "@/components/Toaster";
import { useExerciseDB, type Exercise } from "./explorer";
import { cycleLoads, GAP_DAY_THRESHOLD } from "./load";
import { blockType } from "./options";
import { dayLabel } from "./programs";
import type { Program } from "./types";

/** Hard sets for one muscle group in one session before extra sets are mostly fatigue. */
export const SESSION_SET_CAP = 10;
const STACK_MIN = 3;

export interface Advice {
  key: string;
  title: string;
  message: string;
  tone: "advice" | "warn";
  tag: string;
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export function programAdvice(program: Program, exercises: Map<string, Exercise>): Advice[] {
  const days = cycleLoads(program, exercises, null);
  const n = days.length;
  const out: Advice[] = [];

  days.forEach((day, i) => {
    const label = dayLabel(program, i);
    const id = program.days[i].id;

    const stacked = new Map<string, string[]>();
    day.forEach((g, group) => {
      const types = [...g.byType.entries()].filter(([, v]) => v >= STACK_MIN).map(([t]) => t);
      if (types.length > 1) {
        const k = types.sort().join("+");
        stacked.set(k, [...(stacked.get(k) ?? []), group]);
      }
    });
    stacked.forEach((groups, k) => {
      const types = k.split("+").map((t) => blockType(t).label.toLowerCase());
      const names = groups.map((g) => groupById(g)?.name.toLowerCase() ?? g);
      out.push({
        key: `stack:${id}:${k}`,
        title: `${label}: ${list(types)} both load your ${list(names)}`,
        message: "Different kinds of training on the same muscles in one day stack up fatigue. Consider moving one of them to another day.",
        tone: "advice",
        tag: label,
      });
    });

    day.forEach((g, group) => {
      const name = groupById(group)?.name ?? group;
      if (g.direct > SESSION_SET_CAP + 0.5) {
        out.push({
          key: `excess:${id}:${group}`,
          title: `${Math.round(g.direct)} sets of ${name.toLowerCase()} on ${label}`,
          message: `Around ${SESSION_SET_CAP} hard sets per muscle group in a session is a sensible max. Past that, extra sets mostly add fatigue. Try spreading them across the week.`,
          tone: "warn",
          tag: label,
        });
      }
      if (n > 1 && g.direct >= 1) {
        const prevIndex = (i - 1 + n) % n;
        const prev = days[prevIndex].get(group);
        if (prev && prev.direct >= GAP_DAY_THRESHOLD) {
          out.push({
            key: `gap:${id}:${group}`,
            title: `${name} again on ${label}, right after ${dayLabel(program, prevIndex)}`,
            message: `${Math.round(prev.direct)} sets on ${dayLabel(program, prevIndex)} needs at least a day to recover. Two days apart is better.`,
            tone: "warn",
            tag: label,
          });
        }
      }
    });
  });
  return out;
}

/** Toasts advice the moment a change introduces it. Existing issues stay quiet on load. */
export function useProgramAdvice(program: Program) {
  const { db } = useExerciseDB();
  const exercises = useMemo(() => new Map((db?.exercises ?? []).map((e) => [e.id, e])), [db]);
  const advice = useMemo(() => (db ? programAdvice(program, exercises) : null), [program, exercises, db]);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!advice) return;
    const keys = new Set(advice.map((a) => a.key));
    if (seen.current) {
      advice
        .filter((a) => !seen.current!.has(a.key))
        .slice(0, 2)
        .forEach((a) => toast({ title: a.title, message: a.message, tone: a.tone, tag: a.tag }));
    }
    seen.current = keys;
  }, [advice]);

  return advice ?? [];
}
