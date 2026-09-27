"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Bandage, CalendarDays, Crosshair, Layers, Pin, Plus, Ruler, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { displayName, formatHeight, formatWeight, round1 } from "@/lib/body";
import { GOALS, MODALITIES, WEEKDAYS, labelOf, regionLabel } from "@/lib/options";
import { fmtDuration, freeMinutesByDay } from "@/lib/schedule";
import { useProfile, usePrograms } from "@/lib/storage";
import { DEFAULT_SHAPE, Figure } from "@/components/graphics/Figure";
import { SEVERITY_COLOR } from "@/components/graphics/BodyMap";
import { cn } from "@/components/ui";
import { MiniBoard, programMeta } from "@/components/builder/ProgramPreview";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function PinCard({
  children,
  tilt = 0,
  pinColor = "var(--color-accent)",
  className,
  delay = 0,
}: {
  children: ReactNode;
  tilt?: number;
  pinColor?: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      whileHover={{ rotate: 0, y: -3 }}
      transition={{ type: "spring", bounce: 0.3, delay }}
      className={cn("relative mb-4 break-inside-avoid pt-2", className)}
    >
      <span className="absolute top-0 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center">
        <span className="size-4 rounded-full shadow-[0_2px_6px_rgb(0_0_0/0.6)]" style={{ background: pinColor }} />
        <span className="absolute size-1.5 -translate-x-[3px] -translate-y-[3px] rounded-full bg-white/60" />
      </span>
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_12px_30px_-12px_rgb(0_0_0/0.7)]">{children}</div>
    </motion.div>
  );
}

function PinTitle({ icon: Icon, children }: { icon: typeof Pin; children: ReactNode }) {
  return (
    <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
      <Icon className="size-3.5 text-accent" />
      {children}
    </h3>
  );
}

function ProgramIllustration() {
  const cells = [3, 0, 2, 0, 3, 1, 0, 2, 0, 3, 0, 2, 1, 0, 3, 0, 2, 0, 3, 1, 0];
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((c, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 + i * 0.012 }}
          className={cn(
            "h-6 rounded-md",
            c === 3 && "bg-accent",
            c === 2 && "bg-accent/45",
            c === 1 && "bg-accent/20",
            c === 0 && "border border-dashed border-line-strong",
          )}
        />
      ))}
    </div>
  );
}

export default function HomePage() {
  const profile = useProfile()!;
  const programs = usePrograms() ?? [];
  const today = new Date();
  const todayIdx = (today.getDay() + 6) % 7;
  const u = profile.body.units;
  const activeInjuries = profile.health.injuries.filter((i) => i.status !== "past");
  const [topGoal, ...nextGoals] = profile.goals.ranked;
  const primary = GOALS.find((g) => g.id === topGoal);
  const free = freeMinutesByDay(profile.schedule);
  const maxFree = Math.max(...free, 1);

  return (
    <div className="board-grid min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {greeting()}, {displayName(profile)}.
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
            <Pin className="size-3.5" /> Your board · {programs.length} program{programs.length === 1 ? "" : "s"}
          </div>
        </div>

        <div data-tour="home-board" className="columns-1 gap-6 md:columns-2 xl:columns-3">
          <PinCard tilt={-1}>
            <div className="mb-5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                <Sparkles className="size-3.5" /> Start here
              </span>
              <span className="font-mono text-[11px] text-faint">WK 1-3</span>
            </div>
            <ProgramIllustration />
            <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight">
              {programs.length ? "Start another program" : "Create your first program"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {programs.length
                ? "Build a new block of training alongside your current drafts."
                : "You haven't built a program yet. Design training blocks, weeks and sessions around your goals, schedule and injuries."}
            </p>
            <Link
              href="/programs/new"
              className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-ink transition hover:bg-[#d4ff4a] active:scale-[0.98]"
            >
              <Plus className="size-4" strokeWidth={2.5} /> Create new program
            </Link>
          </PinCard>

          {programs.slice(0, 3).map((p, i) => {
            const meta = programMeta(p);
            return (
              <PinCard key={p.id} tilt={i % 2 ? 0.9 : -0.8} pinColor="#ffb547" delay={0.04 * (i + 1)}>
                <PinTitle icon={Layers}>Draft program</PinTitle>
                <p className="truncate font-display text-xl font-semibold tracking-tight">{p.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{meta.major.join(" · ") || "No goals yet"}</p>
                <div className="mt-4">
                  <MiniBoard program={p} />
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-muted">
                  <span>{meta.stepLabel}</span>
                  <span>{Math.round(meta.progress * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-warn" style={{ width: `${meta.progress * 100}%` }} />
                </div>
                <Link
                  href={`/programs/${p.id}`}
                  className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-medium transition hover:border-line-strong hover:bg-surface-3"
                >
                  Continue building <ArrowRight className="size-4" />
                </Link>
              </PinCard>
            );
          })}

          <PinCard tilt={1.2} pinColor="#5aaeff" delay={0.05}>
            <PinTitle icon={Crosshair}>Your focus</PinTitle>
            {primary && (
              <div className="flex items-center gap-3">
                {primary.icon && (
                  <span className="flex size-11 items-center justify-center rounded-xl bg-info/15 text-info">
                    <primary.icon className="size-5" />
                  </span>
                )}
                <div>
                  <p className="font-display text-lg font-semibold">{primary.label}</p>
                  <p className="text-xs text-muted">Top priority</p>
                </div>
              </div>
            )}
            {nextGoals.length > 0 && (
              <ol className="mt-4 space-y-1.5">
                {nextGoals.slice(0, 3).map((g, i) => (
                  <li key={g} className="flex items-center gap-2.5 text-sm text-muted">
                    <span className="flex size-5 items-center justify-center rounded-full bg-surface-3 font-display text-[11px] font-bold text-ink">
                      {i + 2}
                    </span>
                    {labelOf(GOALS, g)}
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.training.modalities.map((m) => {
                const mod = MODALITIES.find((x) => x.id === m);
                if (!mod) return null;
                const Icon = mod.icon!;
                return (
                  <span key={m} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs">
                    <Icon className="size-3.5 text-muted" />
                    {mod.label}
                  </span>
                );
              })}
            </div>
          </PinCard>

          <PinCard tilt={-0.6} pinColor="#a78bfa" delay={0.1}>
            <PinTitle icon={CalendarDays}>Your week</PinTitle>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((d, i) => {
                const on = free[i] > 0;
                return (
                  <div key={d} className="flex flex-1 flex-col items-center gap-2">
                    <span className={cn("text-[11px]", i === todayIdx ? "font-semibold text-ink" : "text-faint")}>{d[0]}</span>
                    <span
                      className={cn(
                        "flex h-14 w-full items-end justify-center rounded-lg pb-1.5",
                        on ? "bg-violet/20" : "bg-surface-2",
                        i === todayIdx && "ring-1 ring-ink/40",
                      )}
                    >
                      {on && <span className="w-1.5 rounded-full bg-violet" style={{ height: `${Math.max(12, (free[i] / maxFree) * 80)}%` }} />}
                    </span>
                    <span className="text-[10px] tabular-nums text-faint">{fmtDuration(free[i]).replace(/ \d+m$/, "")}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-muted">
              <span className="text-ink">{profile.schedule.daysPerWeek} sessions</span> of about{" "}
              <span className="text-ink">{profile.schedule.sessionMinutes} min</span> per week.
            </p>
          </PinCard>

          <PinCard tilt={0.8} pinColor="#ffb547" delay={0.15}>
            <PinTitle icon={Ruler}>Body snapshot</PinTitle>
            <div className="flex items-center gap-5">
              <Figure shape={DEFAULT_SHAPE} detail={false} className="h-32 shrink-0" />
              <dl className="grid flex-1 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Height</dt>
                  <dd className="font-display text-lg font-semibold">{formatHeight(profile.body.heightCm, u)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Weight</dt>
                  <dd className="font-display text-lg font-semibold">{formatWeight(profile.body.weightKg, u)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Body fat</dt>
                  <dd className="font-display text-lg font-semibold">
                    {profile.body.bodyFat != null ? `${round1(profile.body.bodyFat)}%` : "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </PinCard>

          {activeInjuries.length > 0 && (
            <PinCard tilt={-1.1} pinColor="#ff5c5c" delay={0.2}>
              <PinTitle icon={Bandage}>Working around</PinTitle>
              <ul className="space-y-2.5">
                {activeInjuries.map((i) => (
                  <li key={i.id} className="flex items-center gap-2.5 text-sm">
                    <span className="size-2 rounded-full" style={{ background: SEVERITY_COLOR[i.severity] }} />
                    <span className="flex-1">{regionLabel(i.area)}</span>
                    <span className="text-xs capitalize text-faint">{i.severity}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-faint">Programs will avoid aggravating these areas.</p>
            </PinCard>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-4 mt-2 flex break-inside-avoid flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong/70 px-6 py-10 text-center"
          >
            <Pin className="size-5 -rotate-45 text-faint" />
            <p className="mt-3 text-sm font-medium text-muted">More pins coming</p>
            <p className="mt-1 text-xs text-faint">Sessions, PRs and notes will live on this board.</p>
            <Link href="/profile" className="mt-4 flex items-center gap-1 text-xs text-muted hover:text-ink">
              Review your profile <ArrowRight className="size-3" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
