"use client";

import { useRef, useState, type MouseEvent } from "react";
import { groupById, muscleById } from "@/data/muscles";
import { BODY, type Sex, type View } from "@/lib/explorer";
import { fmtSets, heatColor, heatLabel, HEAT_LEGEND, type GroupVolume } from "@/lib/workout";

const BASE = "#343a43";
const STROKE = "#d9dde3";

export function HeatFigure({
  sex,
  volume,
  dayLabel,
  currentDayId,
  scopeLabel,
}: {
  sex: Sex;
  volume: Map<string, GroupVolume>;
  /** dayId → label like "Mon" or "Day 3" */
  dayLabel: (dayId: string) => string;
  currentDayId: string;
  scopeLabel: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ group: string; x: number; y: number; w: number } | null>(null);
  const [side, setSide] = useState<View>("front");

  const onMove = (e: MouseEvent, muscle: string) => {
    const group = muscleById(muscle)?.group;
    const r = wrap.current?.getBoundingClientRect();
    if (group && r) setHover({ group, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
  };

  const hv = hover ? volume.get(hover.group) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex justify-center">
        <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-[11px]">
          {(["front", "back"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setSide(v)}
              className={`rounded-md px-3 py-1 font-medium capitalize transition ${side === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div ref={wrap} className="relative flex min-h-0 flex-1 gap-1" onMouseLeave={() => setHover(null)}>
        {[side].map((v) => {
          const view = BODY[sex][v];
          return (
            <div key={v} className="flex min-w-0 flex-1 flex-col items-center">
              <svg viewBox={view.viewBox.join(" ")} className="min-h-0 w-full flex-1" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Training volume heatmap, ${v}`}>
                {view.hair.map((d, i) => (
                  <path key={`h${i}`} d={d} fill="#1c1f24" stroke={STROKE} strokeOpacity={0.4} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ))}
                {view.silhouette.map((d, i) => (
                  <path key={`s${i}`} d={d} fill="#15171b" stroke={STROKE} strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                ))}
                {view.shapes.map((s, i) => {
                  const group = muscleById(s.m)?.group ?? "";
                  const sets = volume.get(group)?.total ?? 0;
                  const hovered = hover?.group === group;
                  return (
                    <path
                      key={i}
                      d={s.d}
                      fill={heatColor(sets) ?? BASE}
                      fillOpacity={heatColor(sets) ? (hovered ? 1 : 0.88) : 1}
                      stroke={hovered ? "#ffffff" : STROKE}
                      strokeOpacity={hovered ? 1 : 0.75}
                      strokeWidth={hovered ? 2 : 1.1}
                      vectorEffect="non-scaling-stroke"
                      className="cursor-default transition-[fill,fill-opacity] duration-300"
                      onMouseMove={(e) => onMove(e, s.m)}
                    />
                  );
                })}
              </svg>
            </div>
          );
        })}

        {hover && (
          <div
            className="pointer-events-none absolute z-20 w-56 rounded-xl border border-line-strong bg-surface/95 p-3 shadow-2xl backdrop-blur"
            style={{
              left: Math.min(Math.max(hover.x - 112, 0), Math.max(0, hover.w - 224)),
              top: hover.y + 16,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{groupById(hover.group)?.name}</span>
              <span className="size-2.5 rounded-full" style={{ background: heatColor(hv?.total ?? 0) ?? BASE }} />
            </div>
            <p className="mt-0.5 text-xs text-muted">
              <span className="font-display text-base font-semibold text-ink">{fmtSets(hv?.total ?? 0)}</span> sets {scopeLabel} ·{" "}
              {heatLabel(hv?.total ?? 0)}
            </p>
            {hv && hv.byDay.size > 0 && (
              <ul className="mt-2 space-y-1 border-t border-line pt-2">
                {[...hv.byDay.entries()].map(([dayId, n]) => (
                  <li key={dayId} className="flex justify-between text-xs">
                    <span className={dayId === currentDayId ? "font-medium text-accent" : "text-muted"}>
                      {dayLabel(dayId)}
                      {dayId === currentDayId && " (this day)"}
                    </span>
                    <span className="tabular-nums">{fmtSets(n)}</span>
                  </li>
                ))}
              </ul>
            )}
            {hv && hv.byExercise.size > 0 && (
              <ul className="mt-2 space-y-0.5 border-t border-line pt-2">
                {[...hv.byExercise.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([name, n]) => (
                    <li key={name} className="flex justify-between gap-2 text-[11px] text-faint">
                      <span className="truncate">{name}</span>
                      <span className="tabular-nums">{fmtSets(n)}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 px-1">
        <div
          className="h-2 rounded-full"
          style={{ background: `linear-gradient(to right, ${BASE} 0%, ${HEAT_LEGEND.slice(1).map((n, i, a) => `${heatColor(n)} ${((i + 1) / a.length) * 100}%`).join(", ")})` }}
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-faint">
          {HEAT_LEGEND.map((n) => (
            <span key={n}>{n === 30 ? "30+" : n}</span>
          ))}
        </div>
        <p className="mt-1 text-center text-[10px] text-faint">Effective sets per muscle group {scopeLabel}</p>
      </div>
    </div>
  );
}
