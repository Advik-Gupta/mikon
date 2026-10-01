"use client";

import { useMemo } from "react";
import { EDITOR_KIND, sessionActivity } from "@/data/activities";
import { MUSCLE_GROUPS } from "@/data/muscles";
import { useExerciseDB, type Exercise } from "./explorer";
import { cycleLoads, fatigueOf, muscleUsage, perWeek, segmentMinutes, type DayLoad } from "./load";
import type { Program, ProgramDay } from "./types";
import { entryHardSets } from "./workout";

export function useExerciseMap() {
  const { db } = useExerciseDB();
  return useMemo(() => new Map((db?.exercises ?? []).map((e) => [e.id, e])), [db]);
}

export function dayMinutes(day: ProgramDay) {
  let min = 0;
  for (const b of day.blocks) {
    const kind = EDITOR_KIND[b.type];
    if (kind === "cardio") min += (b.cardio ?? []).reduce((a, s) => a + segmentMinutes(s), 0);
    else if (kind === "session") min += b.session?.durationMin ?? 0;
    else
      for (const e of b.entries ?? []) {
        const sets = e.exercises.reduce((a, x) => a + x.sets.length, 0);
        min += (sets * (40 + (e.restSec ?? 90))) / 60;
      }
  }
  return Math.round(min);
}

export const isTrainingDay = (d: ProgramDay) => d.blocks.some((b) => b.type !== "recovery");

export function dayHeadline(day: ProgramDay, exercises: Map<string, Exercise>) {
  const names: string[] = [];
  for (const b of day.blocks) {
    const kind = EDITOR_KIND[b.type];
    if (kind === "session" && b.session) names.push(sessionActivity(b.session.activity).label);
    for (const e of b.entries ?? []) for (const x of e.exercises) names.push(exercises.get(x.exerciseId)?.name ?? "Custom exercise");
  }
  return names;
}

export function useProgramAnalysis(program: Program) {
  const exercises = useExerciseMap();
  return useMemo(() => {
    const n = program.days.length || 1;
    const days: DayLoad[] = cycleLoads(program, exercises, null);
    const groups = MUSCLE_GROUPS.map((g) => {
      const byDay = days.map((d) => d.get(g.id));
      const direct = byDay.reduce((a, x) => a + (x?.direct ?? 0), 0);
      const indirect = byDay.reduce((a, x) => a + (x?.indirect ?? 0), 0);
      return {
        id: g.id,
        name: g.name,
        direct,
        indirect,
        weekly: perWeek(direct, n),
        byDay: byDay.map((x) => x?.direct ?? 0),
        fatigue: byDay.map((x) => fatigueOf(x)),
        freq: byDay.filter((x) => (x?.direct ?? 0) >= 1).length,
      };
    });
    const minutes = program.days.map(dayMinutes);
    const training = program.days.filter(isTrainingDay).length;
    return {
      days,
      groups,
      muscles: muscleUsage(program, exercises, null),
      minutes,
      training,
      weeklySets: perWeek(
        program.days.reduce((a, d) => a + d.blocks.reduce((b, bl) => b + (bl.entries ?? []).reduce((c, e) => c + entryHardSets(e), 0), 0), 0),
        n,
      ),
      weeklyMinutes: perWeek(minutes.reduce((a, m) => a + m, 0), n),
      exercises,
      ready: exercises.size > 0,
    };
  }, [program, exercises]);
}
