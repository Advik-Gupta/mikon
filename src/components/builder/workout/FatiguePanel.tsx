"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import { Activity, CalendarRange, Sun } from "lucide-react";
import { groupById, muscleById } from "@/data/muscles";
import { BODY, type Exercise, type Sex, type View } from "@/lib/explorer";
import {
  CYCLE_LEGEND,
  cycleColor,
  cycleLoads,
  cycleTotals,
  DAY_LEGEND,
  dayColor,
  dayStatuses,
  fatigueOf,
  GAP_DAY_THRESHOLD,
  shownSets,
  STATE_LABEL,
  type DayState,
  type GroupLoad,
} from "@/lib/load";
import { blockType } from "@/lib/options";
import { dayLabel } from "@/lib/programs";
import type { Program } from "@/lib/types";
import { cn } from "../../ui";

const BASE = "#343a43";
const STROKE = "#d9dde3";
const RED = "#ef4444";

const STATE_COLOR: Record<DayState, string> = {
  fresh: "#5b626c",
  light: "#86efac",
  moderate: "#facc15",
  high: "#fb923c",
  recovering: RED,
  conflict: RED,
};

function setsText(n: number) {
  const s = shownSets(n);
  return `${s} set${s === 1 ? "" : "s"}`;
}

function Sources({ g }: { g: GroupLoad }) {
  const list = [...g.sources.entries()].sort((a, b) => b[1].direct - a[1].direct || b[1].indirect - a[1].indirect).slice(0, 5);
  return (
    <ul className="mt-2 space-y-0.5 border-t border-line pt-2">
      {list.map(([label, s]) => (
        <li key={label} className="flex justify-between gap-2 text-[11px]">
          <span className="truncate text-muted">{label}</span>
          <span className={cn("shrink-0 tabular-nums", s.direct >= 0.5 ? "text-ink" : "text-faint")}>
            {s.direct >= 0.5 ? setsText(s.direct) : "indirect"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function FatiguePanel({
  program,
  exercises,
  dayIndex,
  sex,
  initialType,
}: {
  program: Program;
  exercises: Map<string, Exercise>;
  dayIndex: number;
  sex: Sex;
  initialType: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ group: string; x: number; y: number; w: number } | null>(null);
  const [side, setSide] = useState<View>("front");
  const [mode, setMode] = useState<"day" | "cycle">("day");
  const [filter, setFilter] = useState<string>("all");

  // Views for every activity that appears anywhere in the cycle.
  const types = [...new Set(program.days.flatMap((d) => d.blocks.map((b) => b.type)))].filter((t) => t !== "recovery" && t !== "mobility");
  const active = filter === "all" || types.includes(filter) ? filter : "all";

  const { days, totals, statuses } = useMemo(() => {
    const days = cycleLoads(program, exercises, active === "all" ? null : active);
    return { days, totals: cycleTotals(days), statuses: dayStatuses(days, dayIndex) };
  }, [program, exercises, active, dayIndex]);

  const label = (i: number) => dayLabel(program, i);
  const cycleName = program.structure.cycle === "weekly" && program.days.length === 7 ? "this week" : `this ${program.days.length}-day cycle`;

  const colorFor = (group: string): { fill: string; opacity: number; alert?: boolean } => {
    if (mode === "cycle") {
      const c = cycleColor(fatigueOf(totals.get(group)));
      return { fill: c ?? BASE, opacity: c ? 0.9 : 1 };
    }
    const st = statuses.get(group);
    if (!st) return { fill: BASE, opacity: 1 };
    if (st.state === "conflict") return { fill: RED, opacity: 1, alert: true };
    if (st.state === "recovering") return { fill: RED, opacity: 0.55 };
    const c = dayColor(st.score);
    return { fill: c ?? BASE, opacity: c ? 0.9 : 1 };
  };

  const onMove = (e: MouseEvent, muscle: string) => {
    const group = muscleById(muscle)?.group;
    const r = wrap.current?.getBoundingClientRect();
    if (group && r) setHover({ group, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
  };

  // Quick list of the most loaded groups.
  const top = useMemo(() => {
    const rows =
      mode === "cycle"
        ? [...totals.entries()].map(([g, v]) => ({ g, sets: v.direct, color: cycleColor(fatigueOf(v)) }))
        : [...statuses.entries()].map(([g, s]) => ({ g, sets: s.today?.direct ?? 0, color: colorFor(g).fill, state: s.state }));
    return rows
      .filter((r) => r.sets >= 0.5 || ("state" in r && (r.state === "recovering" || r.state === "conflict")))
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, totals, statuses]);

  const legend = mode === "cycle" ? CYCLE_LEGEND : DAY_LEGEND;
  const ramp = mode === "cycle" ? cycleColor : dayColor;

  /* ---------------------------------------------------------------- tooltip */
  const tip = (() => {
    if (!hover) return null;
    const name = groupById(hover.group)?.name;
    if (mode === "cycle") {
      const g = totals.get(hover.group);
      return (
        <>
          <p className="text-sm font-semibold">{name}</p>
          {!g ? (
            <p className="mt-0.5 text-xs text-muted">Not trained {cycleName}</p>
          ) : (
            <>
              <p className="mt-0.5 text-xs text-muted">
                {g.direct >= 0.5 ? (
                  <>
                    <span className="font-display text-base font-semibold text-ink">{shownSets(g.direct)}</span> sets {cycleName}
                  </>
                ) : (
                  "Worked indirectly only"
                )}
              </p>
              <ul className="mt-2 space-y-1 border-t border-line pt-2">
                {days.map((d, i) => {
                  const dg = d.get(hover.group);
                  if (!dg) return null;
                  return (
                    <li key={i} className="flex justify-between text-xs">
                      <span className={i === dayIndex ? "font-medium text-accent" : "text-muted"}>
                        {label(i)}
                        {i === dayIndex && " (this day)"}
                      </span>
                      <span className="tabular-nums">{dg.direct >= 0.5 ? setsText(dg.direct) : "light"}</span>
                    </li>
                  );
                })}
              </ul>
              <Sources g={g} />
            </>
          )}
        </>
      );
    }
    const st = statuses.get(hover.group);
    const td = st?.today?.direct ?? 0;
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{name}</p>
          <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: STATE_COLOR[st?.state ?? "fresh"] }}>
            <span className="size-2 rounded-full" style={{ background: STATE_COLOR[st?.state ?? "fresh"] }} />
            {STATE_LABEL[st?.state ?? "fresh"]}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {td >= 0.5 ? (
            <>
              <span className="font-display text-base font-semibold text-ink">{shownSets(td)}</span> sets on {label(dayIndex)}
            </>
          ) : st?.today ? (
            `Worked indirectly on ${label(dayIndex)}`
          ) : (
            `Not trained on ${label(dayIndex)}`
          )}
        </p>
        {st && st.prevDirect >= 0.5 && program.days.length > 1 && (
          <p className="mt-1 text-xs text-muted">
            {label(st.prevIndex)} (day before): <span className="text-ink">{setsText(st.prevDirect)}</span>
          </p>
        )}
        {st?.state === "recovering" && (
          <p className="mt-2 rounded-lg bg-danger/10 px-2 py-1.5 text-[11px] leading-snug text-danger">
            {setsText(st.prevDirect)} on {label(st.prevIndex)}. Give it at least a day before training it again.
          </p>
        )}
        {st?.state === "conflict" && (
          <p className="mt-2 rounded-lg bg-danger/10 px-2 py-1.5 text-[11px] leading-snug text-danger">
            {st.prevDirect >= GAP_DAY_THRESHOLD
              ? `Trained again one day after ${setsText(st.prevDirect)} on ${label(st.prevIndex)}.`
              : `${setsText(td)} here and trained again on ${label(st.nextIndex)}.`}{" "}
            With {GAP_DAY_THRESHOLD}+ sets, leave a day in between.
          </p>
        )}
        {st && st.stacked.length > 1 && (
          <p className="mt-2 rounded-lg bg-warn/10 px-2 py-1.5 text-[11px] leading-snug text-warn">
            Loaded by {st.stacked.join(" + ")} on the same day.
          </p>
        )}
        {st?.today && <Sources g={st.today} />}
      </>
    );
  })();

  return (
    <div className="flex h-full flex-col">
      {/* Mode + activity filters */}
      <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {(
          [
            ["day", `This day`, Sun],
            ["cycle", "Full cycle", CalendarRange],
          ] as const
        ).map(([m, text, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium transition",
              mode === m ? "bg-ink text-bg" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-3.5" />
            {text}
          </button>
        ))}
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {["all", ...types].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition",
              active === t ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
              t === initialType && active !== t && "border-line-strong",
            )}
          >
            {t === "all" ? (
              <>
                <Activity className="size-3" /> All
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full" style={{ background: blockType(t).color }} />
                {blockType(t).label}
              </>
            )}
          </button>
        ))}
      </div>

      <div className="mb-1 flex justify-center">
        <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-[11px]">
          {(["front", "back"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSide(v)}
              className={cn("rounded-md px-3 py-0.5 font-medium capitalize transition", side === v ? "bg-ink text-bg" : "text-muted hover:text-ink")}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Figure */}
      <div ref={wrap} className="relative min-h-0 flex-1" onMouseLeave={() => setHover(null)}>
        <svg viewBox={BODY[sex][side].viewBox.join(" ")} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Fatigue map, ${side}`}>
          {BODY[sex][side].hair.map((d, i) => (
            <path key={`h${i}`} d={d} fill="#1c1f24" stroke={STROKE} strokeOpacity={0.4} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {BODY[sex][side].silhouette.map((d, i) => (
            <path key={`s${i}`} d={d} fill="#15171b" stroke={STROKE} strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          {BODY[sex][side].shapes.map((s, i) => {
            const group = muscleById(s.m)?.group ?? "";
            const c = colorFor(group);
            const hovered = hover?.group === group;
            return (
              <path
                key={i}
                d={s.d}
                fill={c.fill}
                fillOpacity={hovered ? Math.min(1, c.opacity + 0.1) : c.opacity}
                stroke={c.alert ? "#ffffff" : hovered ? "#ffffff" : STROKE}
                strokeOpacity={c.alert || hovered ? 1 : 0.75}
                strokeWidth={c.alert ? 2.2 : hovered ? 2 : 1.1}
                vectorEffect="non-scaling-stroke"
                className={cn("transition-[fill,fill-opacity] duration-300", c.alert && "animate-pulse")}
                onMouseMove={(e) => onMove(e, s.m)}
              />
            );
          })}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-20 w-60 rounded-xl border border-line-strong bg-surface/95 p-3 shadow-2xl backdrop-blur"
            style={{ left: Math.min(Math.max(hover.x - 120, 0), Math.max(0, hover.w - 240)), top: hover.y + 16 }}
          >
            {tip}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 px-1">
        <div
          className="h-2 rounded-full"
          style={{ background: `linear-gradient(to right, ${BASE} 0%, ${legend.slice(1).map((n, i, a) => `${ramp(n)} ${((i + 1) / a.length) * 100}%`).join(", ")})` }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-faint">
          <span>Fresh</span>
          <span>Moderate</span>
          <span>Very high</span>
        </div>
        {mode === "day" && (
          <div className="mt-1.5 flex justify-center gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm opacity-55" style={{ background: RED }} /> Recovering
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm ring-1 ring-white" style={{ background: RED }} /> Needs a gap day
            </span>
          </div>
        )}
      </div>

      {/* Top loads */}
      <div className="mt-3 border-t border-line pt-2.5">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          {mode === "day" ? `${label(dayIndex)} · with carry-over` : `Sets ${cycleName}`}
        </p>
        {top.length === 0 ? (
          <p className="text-[11px] text-faint">Nothing programmed yet.</p>
        ) : (
          <ul className="space-y-1">
            {top.map((r) => (
              <li key={r.g} className="flex items-center gap-2 text-xs">
                <span className="size-2 shrink-0 rounded-full" style={{ background: r.color ?? BASE }} />
                <span className="flex-1 truncate">{groupById(r.g)?.name}</span>
                <span className="tabular-nums text-muted">
                  {"state" in r && r.state === "recovering" ? "recovering" : setsText(r.sets)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
