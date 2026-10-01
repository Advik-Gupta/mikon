"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight, Download, Flame } from "lucide-react";
import { latestByMetric } from "@/lib/measure-store";
import { fmtMetric, metricById, type Measurement } from "@/lib/measurements";
import { addDays, toISODate } from "@/lib/programs";
import { workoutStats } from "@/lib/tracker";
import type { Units, WorkoutLog } from "@/lib/types";
import { cn } from "../ui";

function Card({ href, title, sub, children, footer, delay = 0 }: { href: string; title: string; sub: string; children: ReactNode; footer: ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Link href={href} className="flex h-full flex-col rounded-3xl border border-line bg-surface p-4 transition active:scale-[0.98] hover:border-line-strong">
        <p className="text-[15px] font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted">{sub}</p>
        <div className="my-3 flex min-h-14 flex-1 items-end">{children}</div>
        <div className="flex items-center justify-between border-t border-line pt-2.5">
          <span className="min-w-0 truncate">{footer}</span>
          <ChevronRight className="size-4 shrink-0 text-faint" />
        </div>
      </Link>
    </motion.div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return <span className="text-xs text-faint">Not enough entries yet</span>;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 36 - ((v - lo) / span) * 30] as const);
  return (
    <svg viewBox="-4 0 108 40" className="h-12 w-full overflow-visible" preserveAspectRatio="none">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="var(--color-surface)" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

function Dots({ days, on, color }: { days: string[]; on: Set<string>; color: string }) {
  return (
    <div className="grid w-full grid-cols-10 gap-1">
      {days.map((d) => (
        <span key={d} className={cn("aspect-square rounded-[5px]", !on.has(d) && "bg-surface-3")} style={on.has(d) ? { background: color } : undefined} />
      ))}
    </div>
  );
}

export function weekStreak(logs: WorkoutLog[]) {
  const weeks = new Set(
    logs.map((l) => {
      const d = new Date(`${l.date}T12:00`);
      return toISODate(addDays(d, -((d.getDay() + 6) % 7)));
    }),
  );
  const now = new Date();
  let cursor = addDays(now, -((now.getDay() + 6) % 7));
  let streak = 0;
  if (!weeks.has(toISODate(cursor))) cursor = addDays(cursor, -7);
  while (weeks.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export function Insights({ logs, measurements, units }: { logs: WorkoutLog[]; measurements: Measurement[]; units: Units }) {
  const done = [...logs].filter((l) => l.completedAt).sort((a, b) => (a.startedAt ?? a.date).localeCompare(b.startedAt ?? b.date));
  const last7 = done.slice(-7).map((l) => workoutStats(l).sets);
  const maxSets = Math.max(1, ...last7);
  const weights = measurements.filter((m) => m.metric === "weight").sort((a, b) => a.date.localeCompare(b.date));
  const latest = latestByMetric(measurements);
  const days = Array.from({ length: 30 }, (_, i) => toISODate(addDays(new Date(), i - 29)));
  const workoutDays = new Set(done.map((l) => l.date));
  const weighDays = new Set(weights.map((m) => toISODate(new Date(m.date))));
  const weekStart = toISODate(addDays(new Date(), -((new Date().getDay() + 6) % 7)));
  const thisWeek = done.filter((l) => l.date >= weekStart).length;
  const weighThisWeek = weights.filter((m) => toISODate(new Date(m.date)) >= weekStart).length;
  const streak = weekStreak(done);
  const bodyCards = ["weight", "bodyFat", "waist", "chest", "leftBicep", "hips"].filter((id) => latest.get(id));

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 font-display text-xl font-semibold tracking-tight">Insights</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="col-span-2 flex items-center gap-4 rounded-3xl border border-line bg-gradient-to-br from-accent/15 via-surface to-surface p-4 lg:col-span-1">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-ink">
              <Flame className="size-7" />
            </span>
            <span>
              <span className="block font-display text-3xl font-semibold tabular-nums">{streak}</span>
              <span className="block text-xs text-muted">week{streak === 1 ? "" : "s"} in a row · {thisWeek} workout{thisWeek === 1 ? "" : "s"} this week</span>
            </span>
          </motion.div>
          <Card href="/history" title="Workouts" sub={`Last ${last7.length} workouts`} footer={<span className="text-sm"><span className="font-display text-lg font-semibold">{last7.at(-1) ?? 0}</span> sets last time</span>} delay={0.04}>
            {last7.length ? (
              <div className="flex h-14 w-full items-end gap-1.5">
                {last7.map((v, i) => (
                  <motion.span key={i} initial={{ height: 0 }} animate={{ height: `${Math.max(8, (v / maxSets) * 100)}%` }} transition={{ delay: 0.1 + i * 0.04 }} className="flex-1 rounded-t-md bg-[#ff9a6b]" />
                ))}
              </div>
            ) : (
              <span className="text-xs text-faint">No workouts yet</span>
            )}
          </Card>
          <Card
            href="/body/weight"
            title="Weight trend"
            sub={`Last ${Math.min(7, weights.length)} entries`}
            footer={<span className="font-display text-lg font-semibold">{weights.at(-1) ? fmtMetric("mass", weights.at(-1)!.value, units) : "Log your weight"}</span>}
            delay={0.08}
          >
            <Sparkline values={weights.slice(-7).map((m) => m.value)} color="#a78bfa" />
          </Card>
          <Card href="/body/weight" title="Weigh-ins" sub="Last 30 days" footer={<span className="text-sm"><span className="font-display text-lg font-semibold">{weighThisWeek}/7</span> this week</span>} delay={0.12}>
            <Dots days={days} on={weighDays} color="#5ed1a0" />
          </Card>
          <Card href="/history" title="Training days" sub="Last 30 days" footer={<span className="text-sm"><span className="font-display text-lg font-semibold">{thisWeek}</span> this week</span>} delay={0.16}>
            <Dots days={days} on={workoutDays} color="#ff9a6b" />
          </Card>
        </div>
      </section>

      {bodyCards.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-xl font-semibold tracking-tight">Body metrics</h3>
            <Link href="/body" className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
              See all
            </Link>
          </div>
          <div className="scrollbar-thin -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
            {bodyCards.map((id) => {
              const def = metricById(id)!;
              const series = measurements.filter((m) => m.metric === id).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
              return (
                <Link key={id} href={`/body/${id}`} className="w-40 shrink-0 rounded-3xl border border-line bg-surface p-4 transition active:scale-[0.98] sm:w-auto">
                  <p className="text-sm font-semibold">{def.label}</p>
                  <div className="my-2">
                    <Sparkline values={series.map((m) => m.value)} color="#5ed1a0" />
                  </div>
                  <p className="font-display text-lg font-semibold tabular-nums">{fmtMetric(def.kind, latest.get(id)!.last.value, units)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export function ImportCard() {
  return (
    <Link href="/import" className="flex items-center gap-4 rounded-3xl border border-dashed border-accent/40 bg-accent/[0.05] p-4 transition active:scale-[0.99] hover:border-accent/70">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <Download className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Coming from another app?</span>
        <span className="block text-xs text-muted">Import your history from Strong, Hevy, Lyfta or MacroFactor in a minute.</span>
      </span>
      <ChevronRight className="size-4 text-faint" />
    </Link>
  );
}
