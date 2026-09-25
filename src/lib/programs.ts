"use client";

import { BLOCK_TYPES, MODALITY_TO_BLOCK, WEEKDAYS } from "./options";
import { KEYS, readStored, usePrograms, writeStored } from "./storage";
import type { CycleType, GoalTier, Profile, Program, ProgramDay } from "./types";

export const TIERS: { id: GoalTier; label: string; hint: string }[] = [
  { id: "major", label: "Major focus", hint: "What this program is built around" },
  { id: "secondary", label: "Secondary", hint: "Worked in where they fit" },
  { id: "minor", label: "Maintain", hint: "Keep ticking over, don't lose" },
];

export const CYCLE_DAYS: Record<Exclude<CycleType, "custom" | "freeform">, number> = { weekly: 7, biweekly: 14 };

export const newDay = (): ProgramDay => ({ id: crypto.randomUUID(), title: "", blocks: [] });

function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

export function createProgram(profile: Profile | null | undefined): Program {
  const now = new Date().toISOString();
  const ranked = profile?.goals.ranked ?? [];
  const blockTypes = [
    ...new Set([...(profile?.training.modalities ?? []).map((m) => MODALITY_TO_BLOCK[m]).filter(Boolean), "recovery"]),
  ];
  const program: Program = {
    id: crypto.randomUUID(),
    name: "Untitled program",
    createdAt: now,
    updatedAt: now,
    status: "draft",
    step: "goals",
    // Seed priorities from the profile: top two become major focuses.
    goals: ranked.map((id, i) => ({ id, tier: i < 2 ? "major" : "secondary" })),
    targets: [],
    blockTypes: blockTypes.length > 1 ? blockTypes : BLOCK_TYPES.map((b) => b.id),
    structure: { cycle: "weekly", cycleDays: 7, lengthWeeks: 12, startDate: nextMonday() },
    days: [],
  };
  const list = readStored<Program[]>(KEYS.programs) ?? [];
  writeStored(KEYS.programs, [program, ...list]);
  return program;
}

export function updateProgram(id: string, fn: (p: Program) => Program) {
  const list = readStored<Program[]>(KEYS.programs) ?? [];
  writeStored(
    KEYS.programs,
    list.map((p) => (p.id === id ? { ...fn(p), updatedAt: new Date().toISOString() } : p)),
  );
}

export function deleteProgram(id: string) {
  const list = readStored<Program[]>(KEYS.programs) ?? [];
  writeStored(
    KEYS.programs,
    list.filter((p) => p.id !== id),
  );
}

export function useProgram(id: string) {
  const list = usePrograms();
  if (list === undefined) return undefined;
  return list?.find((p) => p.id === id) ?? null;
}

/** Number of days the board should have for a structure. Freeform keeps whatever exists. */
export function targetDayCount(p: Program) {
  const { cycle, cycleDays } = p.structure;
  if (cycle === "weekly" || cycle === "biweekly") return CYCLE_DAYS[cycle];
  if (cycle === "custom") return cycleDays;
  return Math.max(1, p.days.length);
}

export function resizeDays(days: ProgramDay[], n: number) {
  if (days.length >= n) return days.slice(0, n);
  return [...days, ...Array.from({ length: n - days.length }, newDay)];
}

export function dayLabel(p: Program, i: number) {
  const { cycle } = p.structure;
  if (cycle === "weekly" && p.days.length === 7) return WEEKDAYS[i];
  if (cycle === "biweekly" && p.days.length === 14) return `W${Math.floor(i / 7) + 1} ${WEEKDAYS[i % 7]}`;
  return `Day ${i + 1}`;
}

/** Weekday index (0 = Mon) when the board lines up with real weekdays, else null. */
export function weekdayOf(p: Program, i: number) {
  const { cycle } = p.structure;
  if ((cycle === "weekly" && p.days.length === 7) || (cycle === "biweekly" && p.days.length === 14)) return i % 7;
  return null;
}

export function cycleSummary(p: Program) {
  const n = p.days.length || targetDayCount(p);
  const names: Record<CycleType, string> = {
    weekly: "Weekly cycle",
    biweekly: "Two-week cycle",
    custom: `${n}-day cycle`,
    freeform: "Day-by-day",
  };
  return names[p.structure.cycle];
}

export const STEP_ORDER = ["goals", "targets", "training", "structure", "board"] as const;
