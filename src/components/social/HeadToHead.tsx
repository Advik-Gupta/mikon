"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronDown, Swords } from "lucide-react";
import { useApi } from "@/lib/api";
import { useExerciseMap } from "@/lib/analysis";
import { metricFormat, METRIC_UNIT, type Metric, type Point } from "@/lib/metrics";
import { useProfile } from "@/lib/storage";
import { cn } from "../ui";
import { ProgressChart, SERIES_COLORS } from "./ProgressChart";

interface Totals {
  workouts: number;
  sets: number;
  volume: number;
  minutes: number;
  streak: number;
  days: number;
}

interface CompareData {
  status: "ok" | "self" | "hidden" | "progress-hidden";
  source: "programs" | "logs";
  exercises: { exerciseId: string; metric: Metric; mine: Point[]; theirs: Point[] }[];
  weight: { mine: Point[]; theirs: Point[] } | null;
  totals: { mine: Totals; theirs: Totals } | null;
}

const LIMIT = 4;
const compact = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : Math.round(n).toLocaleString());

function Duel({ label, mine, theirs, format = compact }: { label: string; mine: number; theirs: number; format?: (n: number) => string }) {
  const total = mine + theirs || 1;
  const lead = mine === theirs ? 0 : mine > theirs ? 1 : -1;
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-3.5">
      <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2 font-display text-lg font-semibold tabular-nums">
        <span className={cn("shrink-0", lead > 0 && "text-accent")}>{format(mine)}</span>
        <span className={cn("shrink-0", lead < 0 && "text-info")}>{format(theirs)}</span>
      </div>
      <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-3">
        <motion.span initial={{ width: 0 }} animate={{ width: `${(mine / total) * 100}%` }} transition={{ duration: 0.7 }} className="rounded-full bg-accent" />
        <motion.span initial={{ width: 0 }} animate={{ width: `${(theirs / total) * 100}%` }} transition={{ duration: 0.7 }} className="ml-auto rounded-full bg-info" />
      </div>
    </div>
  );
}

export function HeadToHead({ username, name }: { username: string; name: string }) {
  const profile = useProfile();
  const units = profile?.body.units ?? "metric";
  const exercises = useExerciseMap();
  const { data, loading } = useApi<CompareData>(`/api/users/${username}/compare`);
  const [open, setOpen] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  if (loading || !data || data.status === "self" || data.status === "hidden") return null;
  const first = name.split(" ")[0];
  const toUnit = (kg: number) => (units === "metric" ? kg : kg * 2.20462);
  const weightFmt = (kg: number) => (units === "metric" ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(kg * 2.20462)} lb`);
  const t = data.totals;
  const best = (pts: Point[]) => (pts.length ? Math.max(...pts.map((p) => p.value)) : 0);
  const rows = [
    ...(data.weight
      ? [
          {
            id: "weight",
            name: "Body weight",
            sub: "last 6 months",
            neutral: true,
            mine: data.weight.mine.at(-1)!.value,
            theirs: data.weight.theirs.at(-1)!.value,
            mineLabel: weightFmt(data.weight.mine.at(-1)!.value),
            theirsLabel: weightFmt(data.weight.theirs.at(-1)!.value),
            format: weightFmt,
            href: "/body/weight",
            hrefLabel: "Open your weight log",
            series: [
              { id: "me", label: "You", color: SERIES_COLORS[0], points: data.weight.mine },
              { id: "them", label: first, color: SERIES_COLORS[1], points: data.weight.theirs },
            ],
          },
        ]
      : []),
    ...data.exercises.map((x) => {
      const format = metricFormat(x.metric, units);
      return {
        id: x.exerciseId,
        name: exercises.get(x.exerciseId)?.name ?? "Exercise",
        sub: `Best ${METRIC_UNIT[x.metric]}`,
        neutral: false,
        mine: best(x.mine),
        theirs: best(x.theirs),
        mineLabel: x.mine.length ? format(best(x.mine)) : "-",
        theirsLabel: x.theirs.length ? format(best(x.theirs)) : "-",
        format,
        href: `/exercises/${x.exerciseId}`,
        hrefLabel: "Open exercise page",
        series: [
          { id: "me", label: "You", color: SERIES_COLORS[0], points: x.mine },
          { id: "them", label: first, color: SERIES_COLORS[1], points: x.theirs },
        ].filter((q) => q.points.length),
      };
    }),
  ];
  const visible = all ? rows : rows.slice(0, LIMIT);
  const nothing = !data.exercises.length && !data.weight && !(t && (t.mine.workouts || t.theirs.workouts));

  return (
    <section className="mt-6 min-w-0">
      <h3 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight">
        <Swords className="size-5 text-accent" /> Head to head
      </h3>
      {data.status === "progress-hidden" ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">{first} keeps their progress private.</p>
      ) : nothing ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">Nothing to compare yet. Once you&apos;ve both logged workouts, your numbers line up here.</p>
      ) : (
        <>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-accent" /> You
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-info" /> {first}
            </span>
            <span className="text-faint">Last 30 days</span>
          </p>
          {t && (
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Duel label="Workouts" mine={t.mine.workouts} theirs={t.theirs.workouts} />
              <Duel label="Sets" mine={t.mine.sets} theirs={t.theirs.sets} />
              <Duel label={`Volume · ${units === "metric" ? "kg" : "lb"}`} mine={toUnit(t.mine.volume)} theirs={toUnit(t.theirs.volume)} />
              <Duel label="Week streak" mine={t.mine.streak} theirs={t.theirs.streak} />
            </div>
          )}
          {data.exercises.length > 0 && (
            <p className="mt-6 text-sm text-muted">{data.source === "programs" ? "Exercises in both of your programs first, then others you've both logged." : "Exercises you've both logged."} Tap one for the graph.</p>
          )}
          <ul className="mt-3 space-y-2">
            {visible.map((r) => {
              const isOpen = open === r.id;
              const lead = r.mine === r.theirs || r.neutral ? 0 : r.mine > r.theirs ? 1 : -1;
              return (
                <li key={r.id} className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface">
                  <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="flex w-full items-center gap-3 p-3.5 text-left transition active:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{r.name}</span>
                      <span className="block truncate text-[11px] text-faint">{r.sub}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 font-display text-sm font-semibold tabular-nums">
                      <span className={cn(lead > 0 ? "text-accent" : "text-muted")}>{r.mineLabel}</span>
                      <span className="text-[10px] font-normal text-faint">vs</span>
                      <span className={cn(lead < 0 ? "text-info" : "text-muted")}>{r.theirsLabel}</span>
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-faint transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line p-3.5">
                      <ProgressChart series={r.series} format={r.format} />
                      {r.href && (
                        <Link href={r.href} className="mt-3 inline-block text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
                          {r.hrefLabel}
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {rows.length > LIMIT && (
            <button type="button" onClick={() => setAll(!all)} className="mt-3 w-full rounded-full border border-line py-2.5 text-sm font-medium text-muted hover:text-ink">
              {all ? "Show fewer" : `See all ${rows.length}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
