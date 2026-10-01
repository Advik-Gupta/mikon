"use client";

import { useMemo, useState } from "react";
import { ShareStudio } from "@/components/share/ShareStudio";
import { profileShare } from "@/components/share/content";
import { InviteCard } from "@/components/social/InviteCard";
import { weekStreak } from "@/components/home/Insights";
import { workoutStats } from "@/lib/tracker";
import { useExerciseMap } from "@/lib/analysis";
import { activeProgram, dayLabel } from "@/lib/programs";
import { blockType } from "@/lib/options";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarCheck, ExternalLink, LogOut, Mail, MapPin, Pencil, RotateCcw, Share2, Users } from "lucide-react";
import { age, bmi, bmiLabel, displayName, fatBand, formatHeight, formatWeight, round1 } from "@/lib/body";
import type { InjurySeverity } from "@/lib/types";
import { logout, resetAll, useLogs, useProfile, usePrograms, useSessionUser } from "@/lib/storage";
import { useApi, type UserCard } from "@/lib/api";
import { AccountSettings } from "@/components/profile/AccountSettings";
import { AvatarEditor } from "@/components/profile/AvatarEditor";
import { BodyMap, SEVERITY_COLOR } from "@/components/graphics/BodyMap";
import { ProfileSections } from "@/components/profile/ProfileSections";
import { Button, cn } from "@/components/ui";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-faint">{sub}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const profile = useProfile()!;
  const user = useSessionUser();
  const router = useRouter();
  const [tab, setTab] = useState<"training" | "account">("training");
  const friends = useApi<{ friends: UserCard[] }>("/api/friends").data?.friends;
  const storedPrograms = usePrograms();
  const programs = useMemo(() => storedPrograms ?? [], [storedPrograms]);
  const allLogs = useLogs();
  const done = useMemo(() => (allLogs ?? []).filter((l) => l.completedAt), [allLogs]);
  const workouts = done.length;
  const [sharing, setSharing] = useState(false);
  const exerciseMap = useExerciseMap();
  const shareContent = useMemo(
    () =>
      user
        ? profileShare({
            name: user.name,
            username: user.username,
            avatarUrl: user.avatarUrl,
            workouts: done.length,
            streak: weekStreak(done),
            volume: done.reduce((a, l) => a + workoutStats(l).volume, 0),
            friends: friends?.length ?? null,
            units: profile.body.units,
            logs: done,
            exercises: exerciseMap,
            split: (() => {
              const p = activeProgram(programs);
              return p ? p.days.map((d, i) => ({ left: dayLabel(p, i), right: d.title || (d.blocks.some((b) => b.type !== "recovery") ? d.blocks.map((b) => blockType(b.type).label).join(" + ") : "Rest") })).slice(0, 7) : [];
            })(),
          })
        : null,
    [user, done, friends, profile.body.units, exerciseMap, programs],
  );
  const p = profile;
  const u = p.body.units;
  const a = age(p.personal.dob);
  const b = bmi(p.body.heightCm, p.body.weightKg);
  const band = p.body.bodyFat != null ? fatBand(p.personal.sex, p.body.bodyFat) : null;
  const marked = Object.fromEntries(p.health.injuries.map((i) => [i.area, i.severity]));
  const location = [p.address.city, p.address.country].filter(Boolean).join(", ");

  const reset = () => {
    if (
      window.confirm(
        "Reset all your data? Your profile, programs and custom exercises will be deleted and you'll start onboarding again. Your account stays.",
      )
    ) {
      resetAll();
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="relative h-24 bg-gradient-to-br from-accent/25 via-surface-2 to-info/15 sm:h-28">
          <div className="board-grid absolute inset-0" />
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="-mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
            <AvatarEditor size={92} />
            <div className="min-w-0 sm:pb-1">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {user?.name || [p.personal.firstName, p.personal.lastName].filter(Boolean).join(" ")}
              </h2>
              {user && <p className="text-sm text-accent">@{user.username}</p>}
              {user?.bio && <p className="mt-1.5 max-w-xl text-sm text-ink/85">{user.bio}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                {p.personal.preferredName && <span>&ldquo;{displayName(p)}&rdquo;</span>}
                <span className="flex min-w-0 items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0" /> <span className="truncate">{p.personal.email}</span>
                </span>
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="size-3.5" /> Joined{" "}
                  {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <div className="flex gap-5 text-center">
              <Link href="/friends" className="group">
                <p className="font-display text-xl font-semibold tabular-nums group-hover:text-accent">{friends?.length ?? "-"}</p>
                <p className="text-[11px] text-muted">Friends</p>
              </Link>
              <div>
                <p className="font-display text-xl font-semibold tabular-nums">{programs.length}</p>
                <p className="text-[11px] text-muted">Programs</p>
              </div>
              <div>
                <p className="font-display text-xl font-semibold tabular-nums">{workouts}</p>
                <p className="text-[11px] text-muted">Workouts</p>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 sm:flex">
              {user && (
                <Button variant="secondary" onClick={() => router.push(`/u/${user.username}`)}>
                  <ExternalLink className="size-4" /> Public<span className="hidden sm:inline"> profile</span>
                </Button>
              )}
              <Button variant="secondary" data-tour="profile-edit" onClick={() => router.push("/onboarding?edit=personal")}>
                <Pencil className="size-4" /> Edit
              </Button>
              <Button variant="ghost" onClick={reset} title="Reset all your data" aria-label="Reset all your data">
                <RotateCcw className="size-4" />
              </Button>
              <Button variant="ghost" onClick={logout} title="Log out" aria-label="Log out">
                <LogOut className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
        <div className="sm:pr-4">
          <p className="text-sm font-semibold">Share and invite</p>
          <p className="text-xs text-muted">Show off your training or bring friends to Mikon.</p>
          <Button onClick={() => setSharing(true)} className="mt-3 h-11 w-full rounded-full sm:w-auto">
            <Share2 className="size-4" /> Share my profile
          </Button>
        </div>
        <div className="min-w-0">
          <InviteCard compact />
        </div>
      </section>
      <ShareStudio open={sharing} onClose={() => setSharing(false)} content={shareContent} />

      <div className="scrollbar-thin mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {(
          [
            ["training", "Training profile"],
            ["account", "Account & privacy"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn("relative whitespace-nowrap px-3 pb-3 pt-1 text-sm transition", tab === id ? "text-ink" : "text-muted hover:text-ink")}
          >
            {label}
            {tab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
          </button>
        ))}
        <Link href="/friends" className="ml-auto flex items-center gap-1.5 whitespace-nowrap px-3 pb-3 pt-1 text-sm text-muted hover:text-ink">
          <Users className="size-4" /> Friends
        </Link>
      </div>

      {tab === "account" && user ? (
        <div className="mt-6 max-w-3xl">
          <AccountSettings user={user} />
        </div>
      ) : (
        <>
          <div data-tour="profile-stats" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Age" value={a != null ? `${a}` : "-"} />
            <Stat label="Height" value={formatHeight(p.body.heightCm, u)} />
            <Stat label="Weight" value={formatWeight(p.body.weightKg, u)} />
            <Stat label="BMI" value={b != null ? `${b}` : "-"} sub={b != null ? bmiLabel(b) : undefined} />
            <Stat label="Body fat" value={p.body.bodyFat != null ? `${round1(p.body.bodyFat)}%` : "-"} sub={band?.label} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
            <section className="h-fit rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Injury map</h3>
                <span className="text-xs text-muted">{p.health.injuries.length ? `${p.health.injuries.length} reported` : "Nothing reported"}</span>
              </div>
              <BodyMap marked={marked} />
              <div className="mt-4 flex justify-center gap-4 text-[11px] text-muted">
                {(Object.keys(SEVERITY_COLOR) as InjurySeverity[]).map((sev) => (
                  <span key={sev} className="flex items-center gap-1.5 capitalize">
                    <span className="size-2 rounded-full" style={{ background: SEVERITY_COLOR[sev] }} />
                    {sev}
                  </span>
                ))}
              </div>
            </section>
            <ProfileSections profile={p} onEdit={(step) => router.push(`/onboarding?edit=${step}`)} />
          </div>
        </>
      )}
    </div>
  );
}
