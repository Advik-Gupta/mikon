"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { CalendarDays, ChevronRight, Clock, Dumbbell, Flame, Play, Repeat2, Trash2, Trophy } from "lucide-react";
import { useExerciseMap } from "@/lib/analysis";
import { kgToLb, round1 } from "@/lib/body";
import { deleteLog } from "@/lib/logs";
import { addDays, parseISODate, toISODate } from "@/lib/programs";
import { useLogs, useProfile, useSessionUser } from "@/lib/storage";
import { fmtClock, openStartSheet, personalBests, readWorkout, startFromLog, workoutStats } from "@/lib/tracker";
import type { WorkoutLog } from "@/lib/types";
import { ExerciseThumb } from "@/components/explorer/ExerciseBits";
import { RIR_COLOR } from "@/components/tracker/Keypad";
import { Sheet } from "@/components/tracker/Sheet";
import { toast } from "@/components/Toaster";
import { Button, cn } from "@/components/ui";

const WEEKS = 18;

function Heatmap({ logs }: { logs: WorkoutLog[] }) {
  const byDate = useMemo(() => {
    const m = new Map<string, number>();
    logs.forEach((l) => m.set(l.date, (m.get(l.date) ?? 0) + workoutStats(l).sets));
    return m;
  }, [logs]);
  const today = new Date();
  const start = addDays(today, -((today.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  const weeks = Array.from({ length: WEEKS }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const shade = (n: number) => (n === 0 ? "bg-surface-2" : n < 10 ? "bg-accent/35" : n < 20 ? "bg-accent/65" : "bg-accent");
  return (
    <div className="scrollbar-thin overflow-x-auto">
      <div className="flex min-w-max gap-1">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-1">
            {w.map((d) => {
              const iso = toISODate(d);
              const n = byDate.get(iso) ?? 0;
              return <span key={iso} title={`${d.toDateString()}: ${n} sets`} className={cn("size-3.5 rounded-[4px] sm:size-4", d > today ? "bg-transparent" : shade(n))} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ log, onClose }: { log: WorkoutLog | null; onClose: () => void }) {
  const exercises = useExerciseMap();
  const units = useProfile()?.body.units ?? "metric";
  const user = useSessionUser();
  const logs = useLogs() ?? [];
  if (!log) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const st = workoutStats(log);
  const prs = new Set(personalBests(log, logs.filter((l) => (l.startedAt ?? l.date) < (log.startedAt ?? log.date))).map((x) => x.exerciseId));
  const w = (kg: number) => (units === "metric" ? `${round1(kg)} kg` : `${Math.round(kgToLb(kg))} lb`);

  return (
    <Sheet open onClose={onClose} title={log.name || "Workout"} full>
      <div className="px-5 pb-8">
        <p className="text-center text-sm text-muted">{parseISODate(log.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Time", log.durationSec ? fmtClock(log.durationSec * 1000) : "-"],
            ["Sets", String(st.sets)],
            ["Volume", w(st.volume)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface-2 px-3 py-3 text-center">
              <p className="text-[11px] text-muted">{k}</p>
              <p className="font-display text-lg font-semibold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {log.exercises.map((x, xi) => {
            const ex = exercises.get(x.exerciseId);
            let n = 0;
            return (
              <div key={xi} className="overflow-hidden rounded-2xl border border-line">
                <Link href={`/exercises/${x.exerciseId}`} className="flex items-center gap-3 border-b border-line px-3 py-2.5 hover:bg-surface-2">
                  {ex && <ExerciseThumb exercise={ex} className="size-10 shrink-0 rounded-lg" />}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{ex?.name ?? "Exercise"}</span>
                  {prs.has(x.exerciseId) && (
                    <span className="flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">
                      <Trophy className="size-3" /> PR
                    </span>
                  )}
                  <ChevronRight className="size-4 text-faint" />
                </Link>
                <ul className="divide-y divide-line">
                  {x.sets.map((s, i) => {
                    const warm = s.kind === "warmup";
                    if (!warm) n++;
                    return (
                      <li key={i} className={cn("flex items-center gap-3 px-3 py-2 text-sm", !s.done && "opacity-40")}>
                        <span className={cn("flex size-7 items-center justify-center rounded-full text-xs font-semibold", warm ? "bg-warn/15 text-warn" : "bg-surface-2")}>{warm ? "W" : n}</span>
                        <span className="flex-1 tabular-nums">
                          {s.weight ? `${w(s.weight)} × ` : ""}
                          {s.holdSec != null && s.reps == null ? `${s.holdSec}s` : `${s.reps ?? 0} reps`}
                        </span>
                        {s.rir != null && (
                          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: RIR_COLOR[Math.min(6, s.rir)] }}>
                            {s.rir} RIR
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {x.note && <p className="border-t border-line px-3 py-2 text-xs text-muted">{x.note}</p>}
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            className="h-12"
            onClick={() => {
              if (!user) return;
              if (readWorkout()) return toast({ tone: "advice", title: "Finish your current workout first" });
              startFromLog(user.id, log);
              onClose();
            }}
          >
            <Repeat2 className="size-4" /> Repeat
          </Button>
          <Button
            variant="danger"
            className="h-12"
            onClick={() => {
              if (!window.confirm("Delete this workout from your history?")) return;
              deleteLog(log.id);
              onClose();
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export default function HistoryPage() {
  const logs = useLogs();
  const exercises = useExerciseMap();
  const units = useProfile()?.body.units ?? "metric";
  const [open, setOpen] = useState<string | null>(null);

  const done = useMemo(
    () => [...(logs ?? [])].filter((l) => l.completedAt && l.exercises.some((x) => x.sets.some((s) => s.done))).sort((a, b) => (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date)),
    [logs],
  );
  const groups = useMemo(() => {
    const m = new Map<string, WorkoutLog[]>();
    done.forEach((l) => {
      const k = parseISODate(l.date).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      m.set(k, [...(m.get(k) ?? []), l]);
    });
    return [...m.entries()];
  }, [done]);

  const weekStart = toISODate(addDays(new Date(), -((new Date().getDay() + 6) % 7)));
  const monthStart = toISODate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const total = done.reduce((a, l) => a + workoutStats(l).volume, 0);
  const stats = [
    { icon: CalendarDays, k: "This week", v: done.filter((l) => l.date >= weekStart).length },
    { icon: Flame, k: "This month", v: done.filter((l) => l.date >= monthStart).length },
    { icon: Dumbbell, k: "All time", v: done.length },
    { icon: Trophy, k: "Total volume", v: units === "metric" ? `${Math.round(total / 1000)}t` : `${Math.round(kgToLb(total) / 1000)}k lb` },
  ];
  const selected = done.find((l) => l.id === open) ?? null;

  return (
    <div className="board-grid min-h-full">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Workout history</h2>
            <p className="mt-1 text-sm text-muted">Every session you&apos;ve logged.</p>
          </div>
          <Button onClick={() => openStartSheet()} className="shrink-0">
            <Play className="size-4" /> Start
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.k} className="rounded-2xl border border-line bg-surface p-3.5">
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <s.icon className="size-3.5 text-accent" /> {s.k}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{s.v}</p>
            </div>
          ))}
        </div>

        <section className="mt-4 rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Consistency · last {WEEKS} weeks</p>
          <Heatmap logs={done} />
        </section>

        {logs === undefined ? null : done.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
              <Dumbbell className="size-5" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold">No workouts yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted">Start a workout and every set you tick will show up here.</p>
            <Button onClick={() => openStartSheet()} className="mt-5">
              <Play className="size-4" /> Start a workout
            </Button>
          </div>
        ) : (
          groups.map(([month, list]) => (
            <section key={month} className="mt-6">
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">{month}</h3>
              <div className="space-y-2">
                {list.map((l, i) => {
                  const st = workoutStats(l);
                  const d = parseISODate(l.date);
                  return (
                    <motion.button
                      key={l.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i, 8) * 0.03 }}
                      onClick={() => setOpen(l.id)}
                      className="flex w-full items-center gap-3.5 rounded-2xl border border-line bg-surface p-3.5 text-left transition hover:border-line-strong active:scale-[0.99]"
                    >
                      <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-2 leading-none">
                        <span className="text-[10px] uppercase text-muted">{d.toLocaleDateString(undefined, { weekday: "short" })}</span>
                        <span className="mt-0.5 font-display text-lg font-semibold">{d.getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{l.name || "Workout"}</span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                          {l.durationSec ? (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" /> {fmtClock(l.durationSec * 1000)}
                            </span>
                          ) : null}
                          <span>{st.sets} sets</span>
                          <span>{units === "metric" ? `${st.volume.toLocaleString()} kg` : `${Math.round(kgToLb(st.volume)).toLocaleString()} lb`}</span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-faint">
                          {l.exercises.map((x) => exercises.get(x.exerciseId)?.name ?? "Exercise").join(", ")}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-faint" />
                    </motion.button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
      <Detail log={selected} onClose={() => setOpen(null)} />
    </div>
  );
}
