"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, CalendarCheck, Dumbbell, Lock, Pencil, SearchX } from "lucide-react";
import { useApi, type Relation, type UserCard } from "@/lib/api";
import { useExerciseMap } from "@/lib/analysis";
import { GOALS, labelOf } from "@/lib/options";
import { cycleSummary, parseISODate } from "@/lib/programs";
import type { Privacy } from "@/lib/storage";
import type { Program, WorkoutLog } from "@/lib/types";
import { MiniBoard } from "@/components/builder/ProgramPreview";
import { StatusBadge } from "@/components/program/ProgramView";
import { UserAvatar } from "@/components/shell/Avatar";
import { FriendButton } from "@/components/social/FriendButton";
import { FriendsSheet } from "@/components/social/FriendsSheet";
import { HeadToHead } from "@/components/social/HeadToHead";
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

export default function UserPage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const exercises = useExerciseMap();
  const { data, error, loading, reload } = useApi<ProfileData>(`/api/users/${username.toLowerCase()}`);
  const [showFriends, setShowFriends] = useState(false);

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
      <FriendsSheet username={user.username} name={user.name} own={self} open={showFriends} onClose={() => setShowFriends(false)} />
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
                <button type="button" onClick={() => setShowFriends(true)} className="group" aria-label={`See ${user.name}'s friends`}>
                  <p className="font-display text-xl font-semibold tabular-nums group-hover:text-accent">{stats.friends}</p>
                  <p className="text-[11px] text-muted underline decoration-dotted underline-offset-2">Friends</p>
                </button>
                {[
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

            {!self && <HeadToHead username={user.username} name={user.name} />}

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
