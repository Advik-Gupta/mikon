"use client";

import { useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/metrics";
import { parseISODate } from "@/lib/programs";

export interface Series {
  id: string;
  label: string;
  color: string;
  points: Point[];
}

export const SERIES_COLORS = ["#c6f432", "#5aaeff", "#ff9a3c", "#a78bfa", "#3dd6d0", "#ff6b8a"];

const H = 220;
const PAD = { l: 40, r: 14, t: 14, b: 26 };
const day = (d: string) => parseISODate(d).getTime() / 86400000;

export function ProgressChart({ series, format }: { series: Series[]; format: (v: number) => string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => s.points);
  if (!all.length) return null;
  const xs = all.map((p) => day(p.date));
  const ys = all.map((p) => p.value);
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  if (x1 - x0 < 6) {
    x0 -= 3;
    x1 += 3;
  }
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = hi - lo || Math.max(1, hi * 0.2);
  const y0 = Math.max(0, lo - span * 0.15);
  const y1 = hi + span * 0.15;
  const X = (d: number) => PAD.l + ((d - x0) / (x1 - x0)) * (w - PAD.l - PAD.r);
  const Y = (v: number) => PAD.t + (1 - (v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const ticks = Array.from({ length: 4 }, (_, i) => y0 + ((y1 - y0) * i) / 3);
  const dates = [x0, (x0 + x1) / 2, x1];
  const fmtDate = (d: number) => new Date(d * 86400000).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const nearest = hover == null ? [] : series.map((s) => s.points.reduce<Point | null>((best, p) => (!best || Math.abs(day(p.date) - hover) < Math.abs(day(best.date) - hover) ? p : best), null));

  return (
    <div ref={wrap} className="relative w-full overflow-hidden select-none">
      <svg
        width={w}
        height={H}
        className="block touch-pan-y"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - r.left;
          setHover(x0 + ((x - PAD.l) / (w - PAD.l - PAD.r)) * (x1 - x0));
        }}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={w - PAD.r} y1={Y(t)} y2={Y(t)} stroke="#252a31" strokeDasharray="3 4" />
            <text x={PAD.l - 6} y={Y(t) + 3} textAnchor="end" className="fill-faint text-[10px]">
              {format(t)}
            </text>
          </g>
        ))}
        {dates.map((d, i) => (
          <text key={i} x={X(d)} y={H - 6} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} className="fill-faint text-[10px]">
            {fmtDate(d)}
          </text>
        ))}
        {series.map((s) => {
          const pts = s.points.map((p) => [X(day(p.date)), Y(p.value)] as const);
          return (
            <g key={s.id}>
              {pts.length > 1 && <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={pts.length > 20 ? 2 : 3.5} fill="#111317" stroke={s.color} strokeWidth={2} />
              ))}
            </g>
          );
        })}
        {hover != null && hover >= x0 && hover <= x1 && <line x1={X(hover)} x2={X(hover)} y1={PAD.t} y2={H - PAD.b} stroke="#5b626c" />}
      </svg>
      {hover != null && nearest.some(Boolean) && (
        <div
          className="pointer-events-none absolute top-2 z-10 rounded-xl border border-line-strong bg-surface/95 px-3 py-2 text-xs shadow-xl backdrop-blur"
          style={{ left: Math.min(Math.max(8, X(hover) + 10), w - 170) }}
        >
          {series.map((s, i) =>
            nearest[i] ? (
              <p key={s.id} className="flex items-center gap-2 whitespace-nowrap">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                <span className="text-muted">{s.label}</span>
                <span className="ml-auto pl-2 font-semibold tabular-nums">{format(nearest[i]!.value)}</span>
                <span className="text-faint">{fmtDate(day(nearest[i]!.date))}</span>
              </p>
            ) : null,
          )}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => {
          const last = s.points.at(-1);
          const first = s.points[0];
          const delta = last && first ? last.value - first.value : 0;
          return (
            <span key={s.id} className="flex items-center gap-1.5 text-xs">
              <span className="size-2 rounded-full" style={{ background: s.color }} />
              <span className="text-ink/90">{s.label}</span>
              {last && <span className="tabular-nums text-muted">{format(last.value)}</span>}
              {s.points.length > 1 && delta !== 0 && (
                <span className={delta > 0 ? "text-accent" : "text-danger"}>
                  {delta > 0 ? "+" : ""}
                  {format(delta)}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
