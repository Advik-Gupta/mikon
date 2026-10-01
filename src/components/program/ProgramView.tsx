"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, Clock, Dumbbell, Layers, Maximize2, Target, Zap } from "lucide-react";
import { groupById, muscleById } from "@/data/muscles";
import { useProgramAnalysis } from "@/lib/analysis";
import type { Sex } from "@/lib/explorer";
import { cycleColor, dayColor, INDIRECT_WEIGHT, perWeek } from "@/lib/load";
import { blockType, GOALS, labelOf } from "@/lib/options";
import { cycleSummary, dayLabel, programDayOn, TIERS } from "@/lib/programs";
import { fmtDuration } from "@/lib/schedule";
import type { Program, Units } from "@/lib/types";
import { BodyFigure } from "../explorer/BodyFigure";
import { cn } from "../ui";
import { DayContent } from "./DayContent";

const round = (n: number) => Math.round(n);

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Clock; label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="size-3.5 text-accent" /> {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-faint">{sub}</p>}
    </div>
  );
}

export function StatusBadge({ program }: { program: Program }) {
  const today = programDayOn(program, new Date());
  if (program.status === "draft") return <span className="rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-[11px] font-medium text-warn">Draft</span>;
  if (today?.state === "running")
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
        <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Active · week {today.week}
      </span>
    );
  if (today?.state === "upcoming")
    return <span className="rounded-full border border-info/40 bg-info/10 px-2.5 py-0.5 text-[11px] font-medium text-info">Starts in {today.startsIn} day{today.startsIn === 1 ? "" : "s"}</span>;
  if (today?.state === "finished") return <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium text-muted">Finished</span>;
  return <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[11px] font-medium text-muted">Saved</span>;
}

export function ProgramView({ program, sex, units, actions, byline }: { program: Program; sex: Sex; units: Units; actions?: ReactNode; byline?: ReactNode }) {
  const a = useProgramAnalysis(program);
  const n = program.days.length;
  const todayIdx = (() => {
    const t = programDayOn(program, new Date());
    return t?.state === "running" ? t.index : null;
  })();
  const [sel, setSel] = useState<number | "cycle">(todayIdx ?? "cycle");
  const [group, setGroup] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const day = sel === "cycle" ? null : program.days[sel];
  const wk = (v: number) => perWeek(v, n);

  const groupStat = (id: string) => a.groups.find((g) => g.id === id);
  const groupHeat = (id: string) => {
    const g = groupStat(id);
    if (!g) return null;
    if (sel === "cycle") return cycleColor(wk(g.direct + INDIRECT_WEIGHT * g.indirect));
    return dayColor(g.fatigue[sel]);
  };
  const muscleHeat = (id: string) => {
    const u = a.muscles.get(id);
    if (!u) return null;
    if (sel === "cycle") return cycleColor(wk(u.direct + INDIRECT_WEIGHT * u.indirect));
    return dayColor(u.byDay[sel]);
  };
  const tip = (id: string, zoomed: boolean) => {
    if (zoomed) {
      const u = a.muscles.get(id);
      const v = u ? (sel === "cycle" ? wk(u.direct) : u.byDay[sel]) : 0;
      return v >= 0.5 ? `${round(v)} sets${sel === "cycle" ? " a week" : ""}` : u?.indirect ? "Indirect only" : "Not trained";
    }
    const g = groupStat(muscleById(id)?.group ?? "");
    const v = g ? (sel === "cycle" ? g.weekly : g.byDay[sel]) : 0;
    return v >= 0.5 ? `${round(v)} sets${sel === "cycle" ? " a week" : ""}` : g?.indirect ? "Indirect only" : "Not trained";
  };

  const ranked = [...a.groups]
    .map((g) => ({ ...g, value: sel === "cycle" ? g.weekly : g.byDay[sel] }))
    .filter((g) => g.value >= 0.5)
    .sort((x, y) => y.value - x.value);
  const maxValue = Math.max(1, ...ranked.map((g) => g.value));
  const trainedGroups = a.groups.filter((g) => g.direct >= 0.5).sort((x, y) => y.direct - x.direct);
  const goalsByTier = TIERS.map((t) => ({ ...t, goals: program.goals.filter((g) => g.tier === t.id) })).filter((t) => t.goals.length);

  const pick = (s: number | "cycle") => {
    setSel(s);
    setMuscle(null);
  };

  return (
    <div className="board-grid min-h-full">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-8 sm:pt-8 md:pb-12">
        <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.07] via-transparent to-info/[0.05]" />
          <div className="relative flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge program={program} />
                <span className="text-xs text-muted">
                  {cycleSummary(program)}
                  {program.structure.lengthWeeks ? ` · ${program.structure.lengthWeeks} weeks` : ""}
                </span>
              </div>
              <h2 className="mt-2 break-words font-display text-3xl font-semibold tracking-tight sm:text-4xl">{program.name}</h2>
              {byline}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {goalsByTier.flatMap((t) =>
                  t.goals.map((g) => (
                    <span
                      key={g.id}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        t.id === "major" ? "border-accent/40 bg-accent/10 text-accent" : t.id === "secondary" ? "border-line-strong text-ink/80" : "border-line text-muted",
                      )}
                    >
                      {labelOf(GOALS, g.id)}
                    </span>
                  )),
                )}
              </div>
            </div>
            {actions && <div className="flex flex-wrap gap-2 lg:justify-end">{actions}</div>}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={CalendarDays} label="Training days" value={`${a.training}/${n}`} sub={n === 7 ? "per week" : `per ${n} day cycle`} />
          <Stat icon={Dumbbell} label="Hard sets" value={round(a.weeklySets)} sub="per week" />
          <Stat icon={Clock} label="Training time" value={fmtDuration(Math.round(a.weeklyMinutes / 5) * 5)} sub="per week, estimated" />
          <Stat icon={Zap} label="Muscle groups" value={trainedGroups.length} sub="trained directly" />
        </div>

        <div className="scrollbar-thin -mx-4 mt-6 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2 sm:min-w-0">
            <button
              type="button"
              onClick={() => pick("cycle")}
              className={cn(
                "flex w-24 shrink-0 flex-col items-start rounded-2xl border p-3 text-left transition sm:w-28",
                sel === "cycle" ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <Layers className="size-4" />
              <span className="mt-auto pt-4 text-sm font-semibold">Whole {n === 7 ? "week" : "cycle"}</span>
            </button>
            {program.days.map((d, i) => {
              const active = sel === i;
              const rest = !d.blocks.some((b) => b.type !== "recovery");
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => pick(i)}
                  className={cn(
                    "relative flex w-[92px] shrink-0 flex-col rounded-2xl border p-3 text-left transition sm:flex-1 sm:w-auto sm:min-w-[92px]",
                    active ? "border-ink bg-surface-3" : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  {todayIdx === i && <span className="absolute right-2 top-2 rounded-full bg-accent px-1.5 text-[9px] font-bold uppercase text-accent-ink">Today</span>}
                  <span className="text-xs font-semibold">{dayLabel(program, i)}</span>
                  <span className="mt-0.5 truncate text-[11px] text-muted">{d.title || (rest ? "Rest" : "Training")}</span>
                  <span className="mt-3 flex h-1.5 gap-0.5">
                    {rest ? (
                      <span className="h-full flex-1 rounded-full bg-surface-3" />
                    ) : (
                      d.blocks.map((b) => <span key={b.id} className="h-full flex-1 rounded-full" style={{ background: blockType(b.type).color }} />)
                    )}
                  </span>
                  <span className="mt-1.5 text-[10px] tabular-nums text-faint">{a.minutes[i] ? fmtDuration(a.minutes[i]) : "-"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-4">
            {day && (
              <section>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold tracking-tight">
                    {dayLabel(program, sel as number)}
                    {day.title && <span className="text-muted"> · {day.title}</span>}
                  </h3>
                  {a.minutes[sel as number] > 0 && <span className="text-xs text-muted">about {fmtDuration(a.minutes[sel as number])}</span>}
                </div>
                <DayContent day={day} exercises={a.exercises} units={units} />
              </section>
            )}

            <section className="rounded-3xl border border-line bg-surface p-5">
              <h3 className="font-display text-lg font-semibold tracking-tight">{sel === "cycle" ? "Weekly volume by muscle group" : "Muscles worked"}</h3>
              <p className="text-xs text-muted">{sel === "cycle" ? (n === 7 ? "Direct sets per week." : `Direct sets, converted from your ${n} day cycle to a week.`) : "Direct sets on this day."}</p>
              {ranked.length === 0 ? (
                <p className="mt-4 text-sm text-faint">{a.ready ? "Nothing trains muscles here yet." : "Loading…"}</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {ranked.map((g) => (
                    <li key={g.id}>
                      <button type="button" onClick={() => (setGroup(g.id), setMuscle(null))} className="group flex w-full items-center gap-3 text-left">
                        <span className="w-24 shrink-0 truncate text-sm text-ink/90 group-hover:text-ink sm:w-28">{g.name}</span>
                        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${(g.value / maxValue) * 100}%`, background: (sel === "cycle" ? cycleColor(g.value) : dayColor(g.value)) ?? "#3a4049" }}
                          />
                        </span>
                        <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted">
                          {round(g.value)} set{round(g.value) === 1 ? "" : "s"}
                        </span>
                        {sel === "cycle" && <span className="hidden w-8 shrink-0 text-right text-xs tabular-nums text-faint sm:block">{g.freq}×</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="h-fit overflow-hidden rounded-3xl border border-line bg-surface lg:sticky lg:top-4">
            <header className="flex items-center gap-2 border-b border-line px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {group ? groupById(group)?.name : sel === "cycle" ? `Whole ${n === 7 ? "week" : "cycle"}` : dayLabel(program, sel)}
                </p>
                <p className="text-[11px] text-muted">{group ? "Tap a muscle for its numbers" : "Tap a group to zoom in"}</p>
              </div>
              {group && (
                <button
                  type="button"
                  onClick={() => (setGroup(null), setMuscle(null))}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium hover:border-line-strong"
                >
                  <Maximize2 className="size-3.5" /> Whole body
                </button>
              )}
            </header>
            <div className="relative h-[420px] sm:h-[520px]">
              <div className="absolute inset-0 p-3">
                <BodyFigure
                  sex={sex}
                  focusGroup={group}
                  selectedMuscle={muscle}
                  onGroup={(id) => (setGroup(id), setMuscle(null))}
                  onMuscle={(id) => (setGroup(muscleById(id)?.group ?? null), setMuscle(id))}
                  heatFor={(id, zoomed) => (zoomed ? muscleHeat(id) : groupHeat(muscleById(id)?.group ?? ""))}
                  tipFor={tip}
                />
              </div>
            </div>
            {muscle && (
              <div className="border-t border-line px-4 py-3 text-sm">
                <span className="font-medium">{muscleById(muscle)?.name}</span>
                <span className="text-muted"> · {tip(muscle, true)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-[10px] text-faint">
              <span>0</span>
              <span
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background: `linear-gradient(to right, #3a4049, ${(sel === "cycle" ? [1, 5, 10, 15, 20, 30].map((v) => cycleColor(v)) : [1, 3, 6, 9, 12, 16].map((v) => dayColor(v))).join(", ")})`,
                }}
              />
              <span>{sel === "cycle" ? "30+ sets/wk" : "16+ sets"}</span>
            </div>
          </section>
        </div>

        {trainedGroups.length > 0 && n > 1 && (
          <section className="mt-4 rounded-3xl border border-line bg-surface">
            <header className="border-b border-line px-5 py-4">
              <h3 className="font-display text-lg font-semibold tracking-tight">Load map</h3>
              <p className="text-xs text-muted">Fatigue on each muscle group, day by day. Look for heavy days back to back.</p>
            </header>
            <div className="scrollbar-thin overflow-x-auto p-4">
              <table className="w-full min-w-[520px] border-separate border-spacing-1 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-surface" />
                    {program.days.map((d, i) => (
                      <th key={d.id} className="px-0.5 pb-1 font-medium">
                        <button type="button" onClick={() => pick(i)} className={cn("w-full rounded-md py-0.5", sel === i ? "bg-ink text-bg" : "text-muted hover:text-ink")}>
                          {dayLabel(program, i)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trainedGroups.map((g) => (
                    <tr key={g.id}>
                      <td className="sticky left-0 whitespace-nowrap bg-surface pr-3 text-muted">{g.name}</td>
                      {g.fatigue.map((f, i) => (
                        <td
                          key={i}
                          title={`${g.name}, ${dayLabel(program, i)}: ${round(g.byDay[i])} sets`}
                          className={cn("h-7 rounded-md text-center font-display text-[11px] font-semibold tabular-nums", f > 0.15 ? "text-accent-ink" : "bg-surface-2 text-faint")}
                          style={f > 0.15 ? { background: dayColor(f) ?? undefined } : undefined}
                        >
                          {g.byDay[i] >= 1 ? round(g.byDay[i]) : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(program.targets.length > 0 || (program.volumeTargets?.length ?? 0) > 0) && (
          <section className="mt-4 rounded-3xl border border-line bg-surface p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
              <Target className="size-4 text-accent" /> Targets
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {program.targets.map((t) => (
                <div key={t.id} className="rounded-xl border border-line bg-surface-2/50 px-3.5 py-2.5">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted">
                    {t.current ?? "-"} → <span className="text-ink">{t.target ?? "-"}</span> {t.unit}
                  </p>
                </div>
              ))}
              {program.volumeTargets?.map((t) => {
                const name = t.kind === "group" ? groupById(t.ref)?.name : muscleById(t.ref)?.name;
                const g = t.kind === "group" ? groupStat(t.ref) : null;
                const u = t.kind === "muscle" ? a.muscles.get(t.ref) : null;
                const sets = round(g ? g.weekly : u ? wk(u.direct) : 0);
                const met = t.minSets == null || sets >= t.minSets;
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-line bg-surface-2/50 px-3.5 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted">
                        {sets} of {t.minSets ?? "-"} sets a week
                      </p>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", met ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger")}>{met ? "Met" : "Under"}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
