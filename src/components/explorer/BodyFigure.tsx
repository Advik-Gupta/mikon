"use client";

import { MuscleShape } from "@/components/graphics/MuscleShape";
import { useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { groupById, muscleById } from "@/data/muscles";
import { BODY, displayMuscle, type FigureView, type Sex, type Shape, type View } from "@/lib/explorer";

const C = {
  base: "#3a4049",
  hover: "#5b6470",
  inGroup: "#48505b",
  dim: "#24282e",
  stroke: "#d9dde3",
  accent: "#c6f432",
  silhouette: "#15171b",
  hair: "#1c1f24",
};

type BBox = [number, number, number, number];
const union = (list: BBox[]): BBox => [
  Math.min(...list.map((b) => b[0])),
  Math.min(...list.map((b) => b[1])),
  Math.max(...list.map((b) => b[2])),
  Math.max(...list.map((b) => b[3])),
];
const areaOf = (b: BBox) => (b[2] - b[0]) * (b[3] - b[1]);

interface Label {
  muscle: string;
  ax: number;
  ay: number;
  y: number;
}

const labelText = (id: string) => {
  const m = muscleById(id);
  return m?.short ?? m?.name ?? id;
};

/** Zoomed viewBox and leader-line labels for one group on one view. */
function focusLayout(view: FigureView, groupId: string) {
  const own = new Set(groupById(groupId)?.muscles.filter((m) => view.shapes.some((s) => s.m === m)));
  let shapes = view.shapes.filter((s) => own.has(s.m));
  if (!shapes.length) return null;
  // Limbs are far apart: zoom on the viewer-right limb only. Central groups keep both sides.
  if (union(shapes.map((s) => s.b))[2] - union(shapes.map((s) => s.b))[0] > view.viewBox[2] * 0.45) {
    shapes = shapes.filter((s) => s.s === "r");
  }
  const b = union(shapes.map((s) => s.b));
  const w = b[2] - b[0];
  const h = b[3] - b[1];
  const size = Math.max(w, h);
  const pad = size * 0.22;
  const font = Math.max(9, Math.min(size * 0.06, 26));
  // Size the label column to the longest label so nothing is clipped.
  const longest = Math.max(...[...own].map((m) => labelText(m).length));
  const labelW = font * (longest * 0.58 + 2);

  // One label per muscle, anchored on its largest shape (prefer the viewer-right side).
  const labels: Label[] = [...own]
    .map((m) => {
      const mine = shapes.filter((s) => s.m === m);
      const pick = (mine.filter((s) => s.s === "r").length ? mine.filter((s) => s.s === "r") : mine).sort((x, y) => areaOf(y.b) - areaOf(x.b))[0];
      return pick ? { muscle: m, ax: (pick.b[0] + pick.b[2]) / 2, ay: (pick.b[1] + pick.b[3]) / 2, y: 0 } : null;
    })
    .filter((l): l is Label => !!l)
    .sort((x, y) => x.ay - y.ay);
  const gap = font * 1.9;
  let prev = -Infinity;
  for (const l of labels) {
    l.y = Math.max(l.ay, prev + gap);
    prev = l.y;
  }
  // Re-centre the label column vertically on the group.
  const shift = labels.length ? (b[1] + b[3]) / 2 - (labels[0].y + labels[labels.length - 1].y) / 2 : 0;
  labels.forEach((l) => (l.y += shift));

  const top = Math.min(b[1], ...labels.map((l) => l.y - font)) - pad;
  const bottom = Math.max(b[3], ...labels.map((l) => l.y + font)) + pad;
  const labelX = b[2] + pad * 0.9;
  const viewBox: BBox = [b[0] - pad, top, w + pad * 2 + labelW, bottom - top];
  return { viewBox, labels, labelX, font, shapeSet: new Set(shapes) };
}

export interface FigureHighlight {
  primary: string[];
  secondary: string[];
}

export function BodyFigure({
  sex,
  focusGroup,
  selectedMuscle,
  highlight,
  onGroup,
  onMuscle,
  heatFor,
  tipFor,
}: {
  sex: Sex;
  /** Heatmap mode: colour for a muscle's shapes (group colour on the full body, muscle colour when zoomed) */
  heatFor?: (muscleId: string, zoomed: boolean) => string | null;
  /** Extra tooltip line, e.g. "12 sets · 3× a week" */
  tipFor?: (muscleId: string, zoomed: boolean) => string | null;
  focusGroup: string | null;
  selectedMuscle: string | null;
  highlight?: FigureHighlight | null;
  onGroup: (id: string) => void;
  onMuscle: (id: string) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ muscle: string; x: number; y: number } | null>(null);

  const selected = selectedMuscle ? muscleById(selectedMuscle) : null;
  const selectedShape = selectedMuscle ? displayMuscle(selectedMuscle, sex) : null;
  const selectedIsProxy = !!selected && selectedShape !== selected.id;
  const hoverGroup = hover ? muscleById(hover.muscle)?.group : null;

  const views = useMemo(() => {
    return (["front", "back"] as View[])
      .map((v) => {
        const view = BODY[sex][v];
        const focus = focusGroup ? focusLayout(view, focusGroup) : null;
        return { v, view, focus };
      })
      .filter((x) => !focusGroup || x.focus);
  }, [sex, focusGroup]);

  const hl = useMemo(() => {
    if (!highlight) return null;
    // Deep muscles aren't lit through the muscle above them: that would overstate what's working.
    const shown = (m: string) => (muscleById(m)?.deep ? null : displayMuscle(m, sex));
    const map = new Map<string, "primary" | "secondary">();
    highlight.secondary.forEach((m) => {
      const d = shown(m);
      if (d) map.set(d, "secondary");
    });
    highlight.primary.forEach((m) => {
      const d = shown(m);
      if (d) map.set(d, "primary");
    });
    return map;
  }, [highlight, sex]);

  const fillFor = (s: Shape): { fill: string; opacity?: number } => {
    const inFocus = !focusGroup || muscleById(s.m)?.group === focusGroup;
    if (heatFor) {
      if (!inFocus) return { fill: C.dim };
      const heat = heatFor(s.m, !!focusGroup);
      const hovered = focusGroup ? hover?.muscle === s.m : hoverGroup === muscleById(s.m)?.group;
      return { fill: heat ?? (hovered ? C.hover : focusGroup ? C.inGroup : C.base), opacity: heat ? (hovered ? 1 : 0.85) : 1 };
    }
    if (hl?.get(s.m) === "primary") return { fill: C.accent };
    if (hl?.get(s.m) === "secondary") return { fill: C.accent, opacity: 0.42 };
    if (selectedShape === s.m) return { fill: selectedIsProxy ? `url(#${uid}-hatch)` : C.accent };
    if (focusGroup) {
      if (!inFocus) return { fill: C.dim };
      return { fill: hover?.muscle === s.m ? C.hover : C.inGroup };
    }
    if (hoverGroup && muscleById(s.m)?.group === hoverGroup) return { fill: C.hover };
    return { fill: C.base };
  };

  const onMove = (e: MouseEvent, muscle: string) => {
    const r = wrap.current?.getBoundingClientRect();
    if (r) setHover({ muscle, x: e.clientX - r.left, y: e.clientY - r.top });
  };

  const click = (muscle: string) => {
    const m = muscleById(muscle);
    if (!m) return;
    if (focusGroup && m.group === focusGroup) onMuscle(muscle);
    else onGroup(m.group);
  };

  const hovered = hover ? muscleById(hover.muscle) : null;
  const zoomedTip = !!focusGroup && hovered?.group === focusGroup;
  const tip = hovered ? (zoomedTip ? hovered.name : groupById(hovered.group)?.name) : null;
  const tipExtra = hovered && tipFor ? tipFor(hovered.id, zoomedTip) : null;

  return (
    <div ref={wrap} className="relative flex h-full w-full items-stretch justify-center gap-2" onMouseLeave={() => setHover(null)}>
      {views.map(({ v, view, focus }) => {
        const vb = focus?.viewBox ?? view.viewBox;
        return (
          <div key={v} className="relative flex min-w-0 flex-1 flex-col items-center">
            <motion.svg
              initial={false}
              animate={{ viewBox: vb.join(" ") }}
              transition={{ type: "spring", bounce: 0, duration: 0.65 }}
              className="h-full w-full"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`${sex} body, ${v} view`}
            >
              <defs>
                <pattern id={`${uid}-hatch`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
                  <rect width="10" height="10" fill={C.inGroup} />
                  <line x1="0" y1="0" x2="0" y2="10" stroke={C.accent} strokeWidth="5" />
                </pattern>
                <filter id={`${uid}-glow`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {view.hair.map((d, i) => (
                <path key={`h${i}`} d={d} fill={C.hair} stroke={C.stroke} strokeOpacity={0.5} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
              ))}
              {view.silhouette.map((d, i) => (
                <path key={`s${i}`} d={d} fill={C.silhouette} stroke={C.stroke} strokeOpacity={focusGroup ? 0.25 : 0.7} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
              ))}
              {view.shapes.map((s, i) => {
                const f = fillFor(s);
                const lit = f.fill === C.accent && !heatFor;
                const outlined = !!heatFor && selectedShape === s.m;
                const inFocus = !focusGroup || muscleById(s.m)?.group === focusGroup;
                return (
                  <MuscleShape
                    key={i}
                    shape={s}
                    clipKey={`${uid}-${v}-${i}`}
                    fill={f.fill}
                    fillOpacity={f.opacity ?? 1}
                    stroke={outlined ? "#ffffff" : C.stroke}
                    strokeOpacity={outlined ? 1 : inFocus ? 0.9 : 0.3}
                    strokeWidth={outlined ? 3 : 1.3}
                    vectorEffect="non-scaling-stroke"
                    filter={lit && (f.opacity ?? 1) === 1 ? `url(#${uid}-glow)` : undefined}
                    className="cursor-pointer transition-[fill,fill-opacity,stroke-opacity] duration-200"
                    onMouseMove={(e) => onMove(e, s.m)}
                    onClick={() => click(s.m)}
                  />
                );
              })}

              {focus &&
                focus.labels.map((l) => {
                  const active = selectedShape === l.muscle;
                  return (
                    <g key={l.muscle} className="cursor-pointer" onClick={() => onMuscle(l.muscle)} onMouseMove={(e) => onMove(e, l.muscle)}>
                      <polyline
                        points={`${l.ax},${l.ay} ${focus.labelX - focus.font * 1.2},${l.y} ${focus.labelX - focus.font * 0.4},${l.y}`}
                        fill="none"
                        stroke={active ? C.accent : C.stroke}
                        strokeOpacity={active ? 1 : 0.55}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle cx={l.ax} cy={l.ay} r={focus.font * 0.18} fill={active ? C.accent : C.stroke} />
                      <text
                        x={focus.labelX}
                        y={l.y}
                        dominantBaseline="middle"
                        fontSize={focus.font}
                        fontWeight={active ? 600 : 500}
                        fill={active ? C.accent : "#eceef1"}
                        className="select-none"
                        style={{ fontFamily: "var(--font-geist-sans)" }}
                      >
                        {labelText(l.muscle)}
                      </text>
                    </g>
                  );
                })}
            </motion.svg>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-faint">{v}</span>
          </div>
        );
      })}

      {tip && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium shadow-xl"
          style={{ left: hover.x, top: hover.y }}
        >
          {tip}
          {tipExtra && <span className="block text-[11px] font-normal text-muted">{tipExtra}</span>}
        </div>
      )}
    </div>
  );
}

