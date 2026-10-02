"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, CalendarDays, Crown, Lock, SearchX, TrendingUp, Trophy, Users } from "lucide-react";
import { muscleById } from "@/data/muscles";
import { useApi, type UserCard } from "@/lib/api";
import { useExerciseDB, musclesForExercise, titleCase } from "@/lib/explorer";
import { metricFormat, METRIC_LABEL, type Metric, type Point } from "@/lib/metrics";
import { activeProgram, dayLabel } from "@/lib/programs";
import { useLogs, useProfile, usePrograms, useSessionUser } from "@/lib/storage";
import { kgToLb, round1 } from "@/lib/body";
import { parseISODate as parseDate } from "@/lib/programs";
import { BodyFigure } from "@/components/explorer/BodyFigure";
import { ExerciseImages, LevelDot } from "@/components/explorer/ExerciseBits";
import { UserAvatar } from "@/components/shell/Avatar";
import { ProgressChart, SERIES_COLORS } from "@/components/social/ProgressChart";
import { visibilityOf } from "@/components/social/VisibilityPicker";
import { cn } from "@/components/ui";

interface ProgressData {
  metric: Metric;
  series: { user: UserCard; self: boolean; points: Point[] }[];
  hiddenFriends: number;
}

function Card({ title, icon: Icon, children, aside, className }: { title: string; icon: typeof Users; children: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 rounded-3xl border border-line bg-surface p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Icon className="size-4 text-accent" /> {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function ExercisePage() {
  const { id } = useParams<{ id: string }>();
  const { db } = useExerciseDB();
  const profile = useProfile();
  const me = useSessionUser();
  const programs = usePrograms();
  const logs = useLogs();
  const units = profile?.body.units ?? "metric";
  const sex = profile?.personal.sex === "female" ? "female" : "male";
  const { data } = useApi<ProgressData>(`/api/progress/${id}`);
  const exercise = db?.exercises.find((e) => e.id === id);

  if (db && !exercise) {
    return (
      <div className="board-grid flex min-h-full flex-col items-center justify-center p-8 text-center">
        <SearchX className="size-8 text-faint" />
        <p className="mt-4 font-display text-xl font-semibold">Exercise not found</p>
        <Link href="/explorer/exercises" className="mt-5 text-sm text-accent hover:underline">
          Browse exercises
        </Link>
      </div>
    );
  }
  if (!exercise) return <div className="mx-auto mt-10 h-64 max-w-6xl animate-pulse rounded-3xl bg-surface" />;

  const worked = musclesForExercise(exercise);
  const fmt = metricFormat(data?.metric ?? "e1rm", units);
  const mine = data?.series.find((s) => s.self);
  const others = data?.series.filter((s) => !s.self) ?? [];
  const chart = (data?.series ?? [])
    .filter((s) => s.points.length)
    .map((s, i) => ({ id: s.user.id, label: s.self ? "You" : s.user.name.split(" ")[0], color: SERIES_COLORS[s.self ? 0 : (i % (SERIES_COLORS.length - 1)) + 1], points: s.points }));
  const board = (data?.series ?? [])
    .map((s) => ({ ...s, best: s.points.length ? Math.max(...s.points.map((p) => p.value)) : null }))
    .filter((s) => s.best != null)
    .sort((a, b) => b.best! - a.best!);
  const best = mine?.points.length ? Math.max(...mine.points.map((p) => p.value)) : null;
  const first = mine?.points[0];
  const last = mine?.points.at(-1);

  const sessions = (logs ?? [])
    .filter((l) => l.completedAt && l.exercises.some((e) => e.exerciseId === id && e.sets.some((x) => x.done)))
    .sort((a, b) => (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date))
    .slice(0, 12);
  const wfmt = (kg: number) => (units === "metric" ? `${round1(kg)} kg` : `${Math.round(kgToLb(kg))} lb`);
  const program = activeProgram(programs);
  const usedOn = program
    ? program.days
        .map((d, i) => ({ i, d, sets: d.blocks.flatMap((b) => b.entries ?? []).flatMap((e) => e.exercises).filter((x) => x.exerciseId === id) }))
        .filter((x) => x.sets.length)
    : [];

  return (
    <div className="board-grid min-h-full">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-8 sm:pt-8">
        <Link href={`/explorer/exercises?e=${exercise.id}`} className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> Exercise library
        </Link>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ExerciseImages exercise={exercise} className="aspect-[4/3] w-full sm:aspect-auto sm:h-full sm:min-h-64" />
              <div className="p-5 sm:p-6">
                <h2 className="break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">{exercise.name}</h2>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {[exercise.discipline, exercise.equipment, exercise.mechanic].filter(Boolean).map((t) => (
                    <span key={t} className="rounded-full border border-line px-2.5 py-1 text-muted">
                      {titleCase(t!)}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-muted">
                    <LevelDot level={exercise.level} /> {titleCase(exercise.level)}
                  </span>
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Works</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {worked.primary.map((m) => (
                    <span key={m} className="rounded-lg bg-accent/12 px-2 py-1 text-xs font-medium text-accent">
                      {muscleById(m)?.name}
                    </span>
                  ))}
                  {worked.secondary.map((m) => (
                    <span key={m} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
                      {muscleById(m)?.name}
                    </span>
                  ))}
                </div>
                {best != null && (
                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      ["Best", fmt(best)],
                      ["Latest", last ? fmt(last.value) : "-"],
                      ["Sessions", String(mine?.points.length ?? 0)],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-xl border border-line bg-surface-2/50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.12em] text-faint">{k}</p>
                        <p className="font-display text-lg font-semibold tabular-nums">{v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="relative h-72 overflow-hidden rounded-3xl border border-line bg-surface lg:h-auto">
            <div className="absolute inset-0 p-3">
              <BodyFigure sex={sex} focusGroup={null} selectedMuscle={null} highlight={worked} onGroup={() => null} onMuscle={() => null} />
            </div>
          </section>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card
            title="Progress"
            icon={TrendingUp}
            aside={data && <span className="text-[11px] text-faint">{METRIC_LABEL[data.metric]}</span>}
          >
            {!data ? (
              <div className="h-56 animate-pulse rounded-2xl bg-surface-2" />
            ) : chart.length ? (
              <>
                <ProgressChart series={chart} format={fmt} />
                {first && last && mine!.points.length > 1 && (
                  <p className="mt-3 text-sm text-muted">
                    {last.value >= first.value ? "Up" : "Down"} <span className={last.value >= first.value ? "text-accent" : "text-danger"}>{fmt(Math.abs(last.value - first.value))}</span> since your
                    first logged session.
                  </p>
                )}
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-line-strong px-4 py-10 text-center text-sm text-muted">
                Nothing logged yet. Finish a workout with this exercise and your progress shows up here.
              </p>
            )}
            {me && (
              <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-faint">
                <Lock className="size-3" /> Your progress is visible to: {visibilityOf(me.privacy.progress).label.toLowerCase()}.
                <Link href="/profile" className="underline hover:text-ink">
                  Change
                </Link>
              </p>
            )}
          </Card>

          <Card title="Friends leaderboard" icon={Trophy}>
            {!data ? (
              <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
            ) : board.length === 0 ? (
              <p className="text-sm text-muted">
                {others.length || data.hiddenFriends ? "No one has logged this yet." : "Add friends to see how you compare."}{" "}
                {!others.length && (
                  <Link href="/friends?tab=find" className="text-accent hover:underline">
                    Find people
                  </Link>
                )}
              </p>
            ) : (
              <ol className="space-y-1.5">
                {board.map((s, i) => (
                  <li key={s.user.id} className={cn("flex items-center gap-3 rounded-xl px-2.5 py-2", s.self && "bg-accent/[0.07]")}>
                    <span className="w-5 text-center font-display text-sm font-bold text-muted">{i === 0 ? <Crown className="mx-auto size-4 text-warn" /> : i + 1}</span>
                    <UserAvatar name={s.user.name} src={s.user.avatarUrl} size={30} />
                    <Link href={`/u/${s.user.username}`} className="min-w-0 flex-1 truncate text-sm hover:underline">
                      {s.self ? "You" : s.user.name}
                    </Link>
                    <span className="font-display text-sm font-semibold tabular-nums">{fmt(s.best!)}</span>
                  </li>
                ))}
              </ol>
            )}
            {!!data?.hiddenFriends && (
              <p className="mt-3 text-[11px] text-faint">
                {data.hiddenFriends} friend{data.hiddenFriends === 1 ? " keeps" : "s keep"} their progress private.
              </p>
            )}
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {exercise.instructions.length > 0 && (
            <Card title="How to do it" icon={BookOpen}>
              <ol className="space-y-3">
                {exercise.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-[11px] font-bold">{i + 1}</span>
                    <span className="pt-0.5 text-ink/90">{step}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          {sessions.length > 0 && (
            <Card title="Your sessions" icon={CalendarDays} className="lg:col-span-2">
              <ul className="divide-y divide-line">
                {sessions.map((l) => {
                  const sets = l.exercises.filter((e) => e.exerciseId === id).flatMap((e) => e.sets.filter((x) => x.done && x.kind !== "warmup"));
                  return (
                    <li key={l.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                      <span className="w-28 shrink-0 text-sm text-muted">{parseDate(l.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {sets.map((x, i) => (
                          <span key={i} className="rounded-lg bg-surface-2 px-2 py-1 text-xs tabular-nums">
                            {x.weight ? `${wfmt(x.weight)} × ` : ""}
                            {x.holdSec != null && x.reps == null ? `${x.holdSec}s` : x.reps}
                            {x.rir != null && <span className="text-muted"> @{x.rir}</span>}
                          </span>
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          {program && (
            <Card title="In your program" icon={CalendarDays}>
              {usedOn.length ? (
                <ul className="space-y-1.5 text-sm">
                  {usedOn.map(({ i, d, sets }) => (
                    <li key={d.id} className="flex items-center justify-between rounded-xl bg-surface-2/60 px-3 py-2">
                      <span>
                        {dayLabel(program, i)}
                        {d.title && <span className="text-muted"> · {d.title}</span>}
                      </span>
                      <span className="text-xs text-muted">{sets.reduce((a, x) => a + x.sets.filter((s) => s.kind !== "warmup").length, 0)} sets</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Not part of {program.name}.</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
