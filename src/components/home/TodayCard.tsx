"use client";

import Link from "next/link";
import { ArrowRight, Check, CircleCheck, Play } from "lucide-react";
import { useExerciseMap } from "@/lib/analysis";
import { findLog } from "@/lib/logs";
import { useSessionUser } from "@/lib/storage";
import { askRestNotifications, startFromProgram, updateWorkout, useActiveWorkout } from "@/lib/tracker";
import { blockType } from "@/lib/options";
import { addDays, dayLabel, parseISODate, programDayOn, toISODate } from "@/lib/programs";
import type { Program, Units, WorkoutLog } from "@/lib/types";
import { DayContent } from "../program/DayContent";
import { cn } from "../ui";

function TodayButton({ program, index, log }: { program: Program; index: number; log: WorkoutLog | null }) {
  const user = useSessionUser();
  const workout = useActiveWorkout();
  const exercises = useExerciseMap();
  const base = "mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98]";
  if (log?.completedAt)
    return (
      <Link href="/history" className={cn(base, "border border-accent/40 bg-accent/10 text-accent")}>
        <Check className="size-4" strokeWidth={3} /> Done today · view workout
      </Link>
    );
  if (workout)
    return (
      <button type="button" onClick={() => updateWorkout((w) => ({ ...w, minimized: false }))} className={cn(base, "bg-accent text-accent-ink")}>
        <Play className="size-4" /> Resume workout
      </button>
    );
  return (
    <button
      type="button"
      onClick={() => {
        if (!user) return;
        askRestNotifications();
        startFromProgram(user.id, program, index, exercises);
      }}
      className={cn(base, "bg-accent text-accent-ink hover:bg-[#d4ff4a]")}
    >
      <Play className="size-4" /> Start workout
    </button>
  );
}

export function TodayCard({ program, logs, units }: { program: Program; logs: WorkoutLog[]; units: Units }) {
  const exercises = useExerciseMap();
  const now = new Date();
  const today = programDayOn(program, now);

  if (today?.state === "upcoming") {
    const start = parseISODate(program.activeFrom!);
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-info">Coming up</p>
        <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{program.name}</h3>
        <p className="mt-1 text-sm text-muted">
          Starts {start.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}, in {today.startsIn} day{today.startsIn === 1 ? "" : "s"}.
        </p>
        <Link href={`/programs/${program.id}`} className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-medium hover:border-line-strong">
          Preview program <ArrowRight className="size-4" />
        </Link>
      </>
    );
  }

  if (today?.state !== "running") {
    return (
      <>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Program finished</p>
        <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{program.name}</h3>
        <p className="mt-1 text-sm text-muted">You made it to the end. Start it again or build your next block.</p>
        <Link href={`/programs/${program.id}`} className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-medium hover:border-line-strong">
          Open program <ArrowRight className="size-4" />
        </Link>
      </>
    );
  }

  const day = program.days[today.index];
  const date = toISODate(now);
  const log = findLog(logs, program.id, date);
  const rest = !day.blocks.some((b) => b.type !== "recovery");
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 3);
    const p = programDayOn(program, d);
    const l = findLog(logs, program.id, toISODate(d));
    return { d, p, done: !!l?.completedAt, i };
  });

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Today · week {today.week}
        </span>
        <Link href={`/programs/${program.id}`} className="truncate text-[11px] text-muted hover:text-ink">
          {program.name}
        </Link>
      </div>
      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
        {day.title || (rest ? "Rest day" : dayLabel(program, today.index))}
      </h3>

      <div className="mt-4 flex gap-1">
        {week.map(({ d, p, done, i }) => {
          const isToday = i === 3;
          const pd = p?.state === "running" ? program.days[p.index] : null;
          return (
            <Link
              key={i}
              href={done ? "/history" : "#"}
              onClick={(e) => !done && e.preventDefault()}
              className={cn("flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5", isToday ? "bg-surface-3" : done && "hover:bg-surface-2")}
            >
              <span className={cn("text-[10px]", isToday ? "font-semibold text-ink" : "text-faint")}>{d.toLocaleDateString(undefined, { weekday: "narrow" })}</span>
              <span className="flex h-4 items-center">
                {done ? (
                  <CircleCheck className="size-4 text-accent" />
                ) : (
                  <span className="flex gap-px">
                    {(pd?.blocks.filter((b) => b.type !== "recovery") ?? []).slice(0, 3).map((b) => (
                      <span key={b.id} className="size-1.5 rounded-full" style={{ background: blockType(b.type).color }} />
                    ))}
                    {!pd?.blocks.some((b) => b.type !== "recovery") && <span className="size-1.5 rounded-full bg-surface-3" />}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4">
        <DayContent day={day} exercises={exercises} units={units} compact />
      </div>

      {!rest && (
        <TodayButton program={program} index={today.index} log={log} />
      )}
    </>
  );
}
