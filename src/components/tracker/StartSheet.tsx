"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Download, Dumbbell, History, Play, Plus, Ruler, Scale, Sparkles } from "lucide-react";
import { EntrySheet } from "../body/EntrySheet";
import { useExerciseMap } from "@/lib/analysis";
import { blockType } from "@/lib/options";
import { activeProgram, dayLabel, programDayOn } from "@/lib/programs";
import { useLogs, usePrograms, useSessionUser } from "@/lib/storage";
import {
  askRestNotifications,
  elapsedMs,
  fmtClock,
  useNow,
  startEmpty,
  startFromLog,
  startFromProgram,
  updateWorkout,
  useActiveWorkout,
  workoutStats,
} from "@/lib/tracker";
import type { Program } from "@/lib/types";
import { cn } from "../ui";
import { Sheet } from "./Sheet";

const exerciseCount = (p: Program, i: number) =>
  p.days[i].blocks.reduce((a, b) => a + (b.entries ?? []).reduce((c, e) => c + e.exercises.length, 0), 0);

export function StartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useSessionUser();
  const programs = usePrograms() ?? [];
  const logs = useLogs() ?? [];
  const exercises = useExerciseMap();
  const active = useActiveWorkout();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [weighIn, setWeighIn] = useState(false);
  const now = useNow(1000, open);
  if (!user) return null;

  const current = activeProgram(programs);
  const today = current ? programDayOn(current, new Date()) : null;
  const todayDay = current && today?.state === "running" ? current.days[today.index] : null;
  const todayCount = current && today?.state === "running" ? exerciseCount(current, today.index) : 0;
  const recent = [...logs]
    .filter((l) => l.completedAt && l.exercises.length)
    .sort((a, b) => (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date))
    .slice(0, 5);
  const withDays = programs.filter((p) => p.days.some((_, i) => exerciseCount(p, i) > 0));

  const go = (fn: () => void) => {
    askRestNotifications();
    fn();
    onClose();
  };
  const busy = active && active.userId === user.id ? active : null;

  const row = "flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition active:bg-surface-2";

  const shortcut = "flex flex-col items-center gap-2 text-[13px] font-medium";
  const bubble = "flex size-14 items-center justify-center rounded-full bg-surface-2 transition active:scale-90";

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Shortcuts">
        <div className="space-y-5 px-4 pb-6">
          <div className="grid grid-cols-4 gap-2">
            <button type="button" className={shortcut} onClick={() => setWeighIn(true)}>
              <span className={bubble}>
                <Scale className="size-6" />
              </span>
              Weight
            </button>
            <Link href="/body" onClick={onClose} className={shortcut}>
              <span className={bubble}>
                <Ruler className="size-6" />
              </span>
              Measure
            </Link>
            <Link href="/history" onClick={onClose} className={shortcut}>
              <span className={bubble}>
                <History className="size-6" />
              </span>
              History
            </Link>
            <Link href="/import" onClick={onClose} className={shortcut}>
              <span className={bubble}>
                <Download className="size-6" />
              </span>
              Import
            </Link>
          </div>
          {busy && (
            <button
              type="button"
              onClick={() => go(() => updateWorkout((w) => ({ ...w, minimized: false })))}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-left"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-ink">
                <Play className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">Resume {busy.name}</span>
                <span className="block text-xs text-muted">In progress · {fmtClock(elapsedMs(busy, now))}</span>
              </span>
            </button>
          )}

          {!busy && (
            <>
              {todayDay && current && today?.state === "running" && todayCount > 0 && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => go(() => startFromProgram(user.id, current, today.index, exercises))}
                  className="relative w-full overflow-hidden rounded-3xl bg-accent p-5 text-left text-accent-ink"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-70">Today · week {today.week}</span>
                  <span className="mt-1 block font-display text-2xl font-semibold">{todayDay.title || dayLabel(current, today.index)}</span>
                  <span className="mt-0.5 block text-sm opacity-75">
                    {current.name} · {todayCount} exercise{todayCount === 1 ? "" : "s"}
                  </span>
                  <span className="absolute bottom-5 right-5 flex size-12 items-center justify-center rounded-full bg-accent-ink text-accent">
                    <Play className="size-5 translate-x-px" />
                  </span>
                </motion.button>
              )}

              <button type="button" onClick={() => go(() => startEmpty(user.id))} className={cn(row, "border border-line bg-surface-2/50")}>
                <span className="flex size-11 items-center justify-center rounded-xl bg-surface-3">
                  <Plus className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">Empty workout</span>
                  <span className="block text-xs text-muted">Add exercises as you go</span>
                </span>
              </button>

              {withDays.length > 0 && (
                <section>
                  <h3 className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
                    <Sparkles className="size-3.5" /> From your programs
                  </h3>
                  {withDays.map((p) => (
                    <div key={p.id}>
                      <button type="button" onClick={() => setExpanded(expanded === p.id ? null : p.id)} className={row}>
                        <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2">
                          <Dumbbell className="size-5 text-muted" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">{p.name}</span>
                          <span className="block text-xs text-muted">{p.id === current?.id ? "Active program" : `${p.days.length} days`}</span>
                        </span>
                        <ChevronDown className={cn("size-5 text-muted transition", expanded === p.id && "rotate-180")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {expanded === p.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="ml-6 border-l border-line pl-3">
                              {p.days.map((d, i) => {
                                const n = exerciseCount(p, i);
                                if (!n) return null;
                                return (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => go(() => startFromProgram(user.id, p, i, exercises))}
                                    className={row}
                                  >
                                    <span className="flex gap-0.5">
                                      {d.blocks.slice(0, 3).map((b) => (
                                        <span key={b.id} className="h-6 w-1.5 rounded-full" style={{ background: blockType(b.type).color }} />
                                      ))}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium">
                                        {dayLabel(p, i)}
                                        {d.title && <span className="text-muted"> · {d.title}</span>}
                                      </span>
                                      <span className="block text-xs text-muted">
                                        {n} exercise{n === 1 ? "" : "s"}
                                      </span>
                                    </span>
                                    <ChevronRight className="size-4 text-faint" />
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </section>
              )}

              {recent.length > 0 && (
                <section>
                  <h3 className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
                    <History className="size-3.5" /> Repeat a past workout
                  </h3>
                  {recent.map((l) => {
                    const st = workoutStats(l);
                    return (
                      <button key={l.id} type="button" onClick={() => go(() => startFromLog(user.id, l))} className={row}>
                        <span className="flex size-11 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
                          <span className="text-[10px] uppercase text-muted">
                            {new Date(`${l.date}T12:00`).toLocaleDateString(undefined, { month: "short" })}
                          </span>
                          <span className="font-display text-base font-semibold">{new Date(`${l.date}T12:00`).getDate()}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">{l.name || "Workout"}</span>
                          <span className="block truncate text-xs text-muted">
                            {st.exercises} exercises · {st.sets} sets
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-faint" />
                      </button>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </div>
      </Sheet>
      <EntrySheet metric="weight" open={weighIn} onClose={() => setWeighIn(false)} />
    </>
  );
}
