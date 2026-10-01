"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, CalendarCheck, Dumbbell, Lock, Pencil, SearchX, Swords } from "lucide-react";
import { useApi, type Relation, type UserCard } from "@/lib/api";
import { useExerciseMap } from "@/lib/analysis";
import { metricFormat, METRIC_UNIT, type Metric, type Point } from "@/lib/metrics";
import { GOALS, labelOf } from "@/lib/options";
import { cycleSummary, parseISODate } from "@/lib/programs";
import { useProfile } from "@/lib/storage";
import type { Privacy } from "@/lib/storage";
import type { Program, WorkoutLog } from "@/lib/types";
import { MiniBoard } from "@/components/builder/ProgramPreview";
import { StatusBadge } from "@/components/program/ProgramView";
import { UserAvatar } from "@/components/shell/Avatar";
import { FriendButton } from "@/components/social/FriendButton";
import { ProgressChart, SERIES_COLORS } from "@/components/social/ProgressChart";
import { Button } from "@/components/ui";

interface ProfileData {
  user: UserCard & { bio: string; joinedAt: string };
  relation: Relation;
  locked: boolean;
  stats: { friends: number; programs: number; workouts: number | null };
  activeProgram: Program | null;
  programs: Program[];
  recent: WorkoutLog[] | null;
  privacy?: Privacy;
}

interface CompareData {
  status: "ok" | "self" | "hidden" | "no-active-self" | "no-active-them" | "progress-hidden";
  exercises: { exerciseId: string; metric: Metric; mine: Point[]; theirs: Point[] }[];
}

function ProgramCard({ program, href, label }: { program: Program; href: string; label?: string }) {
  const major = program.goals.filter((g) => g.tier === "major").map((g) => labelOf(GOALS, g.id));
  return (
    <Link href={href} className="group flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {label && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">{label}</p>}
          <p className="truncate font-display text-lg font-semibold">{program.name}</p>
          <p className="truncate text-xs text-muted">{major.join(" · ") || cycleSummary(program)}</p>
        </div>
        <StatusBadge program={program} />
      </div>
      <MiniBoard program={program} />
      <span className="mt-4 flex items-center gap-1 text-xs text-muted group-hover:text-ink">
        View program <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

function Compare({ username, name }: { username: string; name: string }) {
  const profile = useProfile();
  const units = profile?.body.units ?? "metric";
  const exercises = useExerciseMap();
  const { data, loading } = useApi<CompareData>(`/api/users/${username}/compare`);
  if (loading || !data || data.status === "self" || data.status === "hidden") return null;
  const first = name.split(" ")[0];

  const message: Record<string, string> = {
    "no-active-self": "Start a program of your own to compare the exercises you share.",
    "no-active-them": `${first} isn't running a program right now.`,
  };

  return (
    <section className="mt-6">
      <h3 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
        <Swords className="size-5 text-accent" /> Head to head
      </h3>
      <p className="mt-0.5 text-sm text-muted">Exercises in both of your active programs.</p>
      {message[data.status] ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">{message[data.status]}</p>
      ) : data.exercises.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">Your active programs don&apos;t share any exercises yet.</p>
      ) : (
        <>
          {data.status === "progress-hidden" && <p className="mt-3 text-xs text-faint">{first} keeps their progress private, so only your numbers are shown.</p>}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {data.exercises.map((x) => {
              const ex = exercises.get(x.exerciseId);
              const fmt = metricFormat(x.metric, units);
              const series = [
                { id: "me", label: "You", color: SERIES_COLORS[0], points: x.mine },
                { id: "them", label: first, color: SERIES_COLORS[1], points: x.theirs },
              ].filter((s) => s.points.length);
              return (
                <div key={x.exerciseId} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <Link href={`/exercises/${x.exerciseId}`} className="truncate font-medium hover:underline">
                      {ex?.name ?? "Exercise"}
                    </Link>
                    <span className="shrink-0 text-[11px] text-faint">{METRIC_UNIT[x.metric]}</span>
                  </div>
                  {series.length ? (
                    <ProgressChart series={series} format={fmt} />
                  ) : (
                    <p className="py-8 text-center text-sm text-faint">No logged sessions yet. Log a workout to start the race.</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default function UserPage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const exercises = useExerciseMap();
  const { data, error, loading, reload } = useApi<ProfileData>(`/api/users/${username.toLowerCase()}`);

  if (loading) return <div className="mx-auto mt-10 h-48 max-w-5xl animate-pulse rounded-3xl bg-surface px-4" />;
  if (error || !data) {
    return (
      <div className="board-grid flex min-h-full flex-col items-center justify-center p-8 text-center">
        <SearchX className="size-8 text-faint" />
        <p className="mt-4 font-display text-xl font-semibold">No one here</p>
        <p className="mt-1 text-sm text-muted">@{username} doesn&apos;t exist.</p>
        <Link href="/friends?tab=find" className="mt-5 text-sm text-accent hover:underline">
          Find people
        </Link>
      </div>
    );
  }

  const { user, relation, locked, stats } = data;
  const self = relation === "self";

  return (
    <div className="board-grid min-h-full">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
        <section className="overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="relative h-24 bg-gradient-to-br from-info/25 via-surface-2 to-accent/20 sm:h-28">
            <div className="board-grid absolute inset-0" />
          </div>
          <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div className="-mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <UserAvatar name={user.name} src={user.avatarUrl} size={92} className="ring-4 ring-surface" />
              <div className="sm:pb-1">
                <h2 className="font-display text-2xl font-semibold tracking-tight">{user.name}</h2>
                <p className="text-sm text-accent">@{user.username}</p>
                {user.bio && <p className="mt-1.5 max-w-xl text-sm text-ink/85">{user.bio}</p>}
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <CalendarCheck className="size-3.5" /> Joined {new Date(user.joinedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <div className="flex gap-5 text-center">
                {[
                  ["Friends", stats.friends],
                  ["Programs", stats.programs],
                  ["Workouts", stats.workouts],
                ].map(([label, v]) => (
                  <div key={label as string}>
                    <p className="font-display text-xl font-semibold tabular-nums">{v ?? "-"}</p>
                    <p className="text-[11px] text-muted">{label}</p>
                  </div>
                ))}
              </div>
              {self ? (
                <Button variant="secondary" onClick={() => router.push("/profile")}>
                  <Pencil className="size-4" /> Edit profile
                </Button>
              ) : (
                <FriendButton userId={user.id} name={user.name} relation={relation} onChange={() => reload()} />
              )}
            </div>
          </div>
        </section>

        {self && data.privacy && (
          <p className="mt-3 px-1 text-xs text-faint">
            This is how others see you. Profile: {data.privacy.profile}, active program: {data.privacy.activeProgram}, progress: {data.privacy.progress}.{" "}
            <Link href="/profile" className="text-muted underline hover:text-ink">
              Change
            </Link>
          </p>
        )}

        {locked ? (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
              <Lock className="size-5" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold">This profile is private</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              {relation === "friends" ? "They aren't sharing anything right now." : `Add ${user.name.split(" ")[0]} as a friend to see their training.`}
            </p>
          </div>
        ) : (
          <>
            {data.activeProgram && (
              <section className="mt-6">
                <ProgramCard program={data.activeProgram} href={`/u/${user.username}/programs/${data.activeProgram.id}`} label="Currently running" />
              </section>
            )}

            {!self && <Compare username={user.username} name={user.name} />}

            {data.programs.length > 0 && (
              <section className="mt-6">
                <h3 className="font-display text-xl font-semibold tracking-tight">Shared programs</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {data.programs.map((p) => (
                    <ProgramCard key={p.id} program={p} href={`/u/${user.username}/programs/${p.id}`} />
                  ))}
                </div>
              </section>
            )}

            {data.recent && data.recent.length > 0 && (
              <section className="mt-6">
                <h3 className="font-display text-xl font-semibold tracking-tight">Recent workouts</h3>
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {data.recent.map((w) => {
                    const sets = w.exercises.reduce((a, x) => a + x.sets.filter((s) => s.done).length, 0);
                    return (
                      <li key={w.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                          <Dumbbell className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {w.exercises
                              .slice(0, 3)
                              .map((x) => exercises.get(x.exerciseId)?.name ?? "Exercise")
                              .join(", ")}
                            {w.exercises.length > 3 && ` +${w.exercises.length - 3}`}
                          </p>
                          <p className="text-xs text-muted">
                            {sets} sets · {parseISODate(w.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {!data.activeProgram && !data.programs.length && !data.recent?.length && (
              <p className="mt-6 rounded-2xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">Nothing shared yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
