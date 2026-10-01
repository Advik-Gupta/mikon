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

export const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function parseISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

export function programEnd(p: Program) {
  if (!p.activeFrom || !p.structure.lengthWeeks) return null;
  return addDays(parseISODate(p.activeFrom), p.structure.lengthWeeks * 7 - 1);
}

export function programDayOn(p: Program, date: Date) {
  if (!p.activeFrom || !p.days.length) return null;
  const start = parseISODate(p.activeFrom);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const since = daysBetween(start, day);
  if (since < 0) return { state: "upcoming" as const, startsIn: -since };
  const end = programEnd(p);
  if (end && day > end) return { state: "finished" as const };
  const n = p.days.length;
  const anchored = weekdayOf(p, 0) !== null;
  const anchor = anchored ? addDays(start, -((start.getDay() + 6) % 7)) : start;
  const index = daysBetween(anchor, day) % n;
  return { state: "running" as const, index, week: Math.floor(since / 7) + 1 };
}

export const activeProgram = (list: Program[] | null | undefined) => list?.find((p) => p.status === "ready" && p.activeFrom) ?? null;

export function activateProgram(id: string, startDate: string) {
  const list = readStored<Program[]>(KEYS.programs) ?? [];
  const now = new Date().toISOString();
  writeStored(
    KEYS.programs,
    list.map((p) => {
      if (p.id === id) return { ...p, status: "ready" as const, activeFrom: startDate, updatedAt: now };
      return p.activeFrom ? { ...p, activeFrom: null, updatedAt: now } : p;
    }),
  );
}

export const deactivateProgram = (id: string) => updateProgram(id, (p) => ({ ...p, activeFrom: null }));

export const programHref = (p: Program) => (p.status === "draft" ? `/programs/${p.id}/edit` : `/programs/${p.id}`);
