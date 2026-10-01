"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, PartyPopper, RotateCcw, Trophy } from "lucide-react";
import { kgToLb, lbToKg, round1 } from "@/lib/body";
import { useExerciseMap } from "@/lib/analysis";
import { bestValue, deleteLog, findLog, logProgress, metricFor, planToLog, saveLog, seriesFor } from "@/lib/logs";
import { activeProgram, addDays, dayLabel, parseISODate, programDayOn, toISODate } from "@/lib/programs";
import { useLogs, useProfile, usePrograms } from "@/lib/storage";
import type { LoggedSet, WorkoutLog } from "@/lib/types";
import { DayContent } from "@/components/program/DayContent";
import { ExerciseThumb } from "@/components/explorer/ExerciseBits";
import { toast } from "@/components/Toaster";
import { Button, cn, Textarea } from "@/components/ui";

function NumCell({ value, onChange, label, suffix }: { value: number | null; onChange: (v: number | null) => void; label: string; suffix?: string }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        placeholder="-"
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
        className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-center text-[15px] tabular-nums outline-none transition focus:border-accent/60"
      />
      {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-faint">{suffix}</span>}
    </label>
  );
}

function Logger() {
  const params = useSearchParams();
  const router = useRouter();
  const programs = usePrograms();
  const logs = useLogs();
  const profile = useProfile();
  const exercises = useExerciseMap();
  const units = profile?.body.units ?? "metric";
  const [notesOpen, setNotesOpen] = useState(false);

  const program = activeProgram(programs);
  const date = params.get("date") ?? toISODate(new Date());
  const day = program ? programDayOn(program, parseISODate(date)) : null;
  const saved = program ? findLog(logs, program.id, date) : null;

  if (programs === undefined) return null;
  if (!program || day?.state !== "running") {
    return (
      <div className="board-grid flex min-h-full flex-col items-center justify-center p-8 text-center">
        <p className="font-display text-xl font-semibold">{program ? "No training on this date" : "No active program"}</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          {program ? "This date is outside your program." : "Start one of your programs and each day's workout will be ready to log here."}
        </p>
        <Link href={program ? "/" : "/programs"} className="mt-5 text-sm text-accent hover:underline">
          {program ? "Back home" : "Go to programs"}
        </Link>
      </div>
    );
  }

  const pday = program.days[day.index];
  const log: WorkoutLog = saved ?? planToLog(program, day.index, date);
  const write = (fn: (l: WorkoutLog) => WorkoutLog) => saveLog(fn(log));
  const setSet = (xi: number, si: number, patch: Partial<LoggedSet>) =>
    write((l) => ({
      ...l,
      exercises: l.exercises.map((x, i) => (i !== xi ? x : { ...x, sets: x.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })),
    }));
  const progress = logProgress(log);
  const shift = (n: number) => router.replace(`/workout?date=${toISODate(addDays(parseISODate(date), n))}`);
  const isToday = date === toISODate(new Date());
  const history = (logs ?? []).filter((l) => l.date < date);

  const finish = () => {
    write((l) => ({ ...l, completedAt: new Date().toISOString(), exercises: l.exercises }));
    const prs = log.exercises.filter((x) => {
      const ex = exercises.get(x.exerciseId);
      const m = metricFor(ex, x.sets);
      const now = bestValue(x.sets, m);
      const before = seriesFor(history, x.exerciseId, m);
      return now != null && before.length > 0 && now > Math.max(...before.map((p) => p.value));
    });
    toast({
      tone: "success",
      title: "Workout logged",
      message: prs.length ? `New best on ${prs.map((x) => exercises.get(x.exerciseId)?.name ?? "an exercise").join(", ")}.` : "Nice work. Rest up.",
    });
    router.push("/");
  };

  return (
    <div className="board-grid min-h-full">
      <div className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Home">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-semibold leading-tight">
              {dayLabel(program, day.index)}
              {pday.title && ` · ${pday.title}`}
            </p>
            <p className="truncate text-[11px] text-muted">
              {program.name} · week {day.week}
            </p>
          </div>
          <div className="flex items-center rounded-xl border border-line bg-surface">
            <button type="button" onClick={() => shift(-1)} className="p-2 text-muted hover:text-ink" aria-label="Previous day">
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-16 text-center text-xs font-medium">
              {isToday ? "Today" : parseISODate(date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
            </span>
            <button type="button" onClick={() => shift(1)} className="p-2 text-muted hover:text-ink" aria-label="Next day">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-surface-3">
          <motion.div className="h-full bg-accent" animate={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-6 pt-5 sm:px-6">
        {log.completedAt && (
          <div className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
            <PartyPopper className="size-5 text-accent" />
            <span className="flex-1">Logged {new Date(log.completedAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}. You can still edit it.</span>
          </div>
        )}

        {log.exercises.length === 0 && <DayContent day={pday} exercises={exercises} units={units} />}

        {log.exercises.map((x, xi) => {
          const ex = exercises.get(x.exerciseId);
          const timed = x.sets.some((s) => s.holdSec != null && s.reps == null);
          const metric = metricFor(ex, x.sets);
          const prev = seriesFor(history, x.exerciseId, metric).at(-1);
          const now = bestValue(x.sets, metric);
          const pr = now != null && prev && now > prev.value;
          return (
            <section key={xi} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                {ex && <ExerciseThumb exercise={ex} className="size-11 shrink-0 rounded-xl" />}
                <div className="min-w-0 flex-1">
                  <Link href={`/exercises/${x.exerciseId}`} className="block truncate font-medium hover:underline">
                    {ex?.name ?? (exercises.size ? "Custom exercise" : <span className="inline-block h-3.5 w-40 animate-pulse rounded bg-surface-3 align-middle" />)}
                  </Link>
                  <p className="text-[11px] text-muted">
                    {prev ? `Last time: ${metric === "e1rm" ? `${round1(units === "metric" ? prev.value : kgToLb(prev.value))} ${units === "metric" ? "kg" : "lb"} e1RM` : `${prev.value}${metric === "hold" ? "s" : " reps"}`}` : "First time logging this"}
                  </p>
                </div>
                {pr && (
                  <span className="flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">
                    <Trophy className="size-3" /> PR
                  </span>
                )}
              </header>
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                  <span className="w-7">Set</span>
                  {!timed && <span className="flex-1 text-center">{units === "metric" ? "kg" : "lb"}</span>}
                  <span className="flex-1 text-center">{timed ? "Seconds" : "Reps"}</span>
                  <span className="w-11" />
                </div>
                {x.sets.map((s, si) => (
                  <div key={si} className={cn("flex items-center gap-2 rounded-xl px-1 py-1 transition", s.done && "bg-accent/[0.06]")}>
                    <span className="w-7 text-center font-display text-sm font-semibold text-muted">{si + 1}</span>
                    {!timed && (
                      <NumCell
                        label="Weight"
                        value={s.weight == null ? null : units === "metric" ? round1(s.weight) : Math.round(kgToLb(s.weight))}
                        onChange={(v) => setSet(xi, si, { weight: v == null ? null : units === "metric" ? v : lbToKg(v) })}
                      />
                    )}
                    {timed ? (
                      <NumCell label="Seconds" value={s.holdSec} onChange={(v) => setSet(xi, si, { holdSec: v })} />
                    ) : (
                      <NumCell label="Reps" value={s.reps} onChange={(v) => setSet(xi, si, { reps: v })} />
                    )}
                    <button
                      type="button"
                      onClick={() => setSet(xi, si, { done: !s.done })}
                      aria-pressed={s.done}
                      aria-label={`Set ${si + 1} done`}
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl border transition active:scale-95",
                        s.done ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-faint hover:text-ink",
                      )}
                    >
                      <Check className="size-5" strokeWidth={3} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    write((l) => ({
                      ...l,
                      exercises: l.exercises.map((y, i) => (i !== xi ? y : { ...y, sets: [...y.sets, { ...(y.sets.at(-1) ?? { weight: null, reps: null, holdSec: null }), done: false }] })),
                    }))
                  }
                  className="mt-1 w-full rounded-xl py-2 text-xs font-medium text-muted hover:bg-surface-2 hover:text-ink"
                >
                  + Add set
                </button>
              </div>
            </section>
          );
        })}

        {log.exercises.length > 0 && pday.blocks.some((b) => b.cardio?.length || b.session) && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Also today</h3>
            <DayContent day={{ ...pday, blocks: pday.blocks.filter((b) => b.cardio?.length || b.session) }} exercises={exercises} units={units} />
          </section>
        )}

        {notesOpen || log.notes ? (
          <Textarea value={log.notes} onChange={(e) => write((l) => ({ ...l, notes: e.target.value.slice(0, 2000) }))} placeholder="How did it feel? Anything to remember next time?" />
        ) : (
          <button type="button" onClick={() => setNotesOpen(true)} className="text-sm text-muted hover:text-ink">
            + Add notes
          </button>
        )}
      </div>

      <div className="sticky bottom-0 z-30 px-4 pb-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-line-strong bg-surface/95 p-2 shadow-2xl backdrop-blur">
          {saved && (
            <Button variant="ghost" onClick={() => window.confirm("Clear everything you logged for this day?") && deleteLog(saved.id)} aria-label="Clear log">
              <RotateCcw className="size-4" />
            </Button>
          )}
          <span className="flex-1 px-2 text-xs text-muted">
            {Math.round(progress * 100)}% of sets done
          </span>
          <Button onClick={finish} className="px-6">
            <Check className="size-4" strokeWidth={2.5} /> {log.completedAt ? "Update" : "Finish workout"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <Suspense>
      <Logger />
    </Suspense>
  );
}
