"use client";

import { useState } from "react";
import { BODY_REGIONS } from "@/lib/options";
import type { InjurySeverity } from "@/lib/types";
import { cn } from "../ui";
import { Figure } from "./Figure";

export const SEVERITY_COLOR: Record<InjurySeverity, string> = {
  mild: "#ffd447",
  moderate: "#ff9a3c",
  severe: "#ff5c5c",
};

export function BodyMap({
  marked,
  onToggle,
  className,
}: {
  /** region id → severity */
  marked: Record<string, InjurySeverity>;
  onToggle?: (regionId: string) => void;
  className?: string;
}) {
  const [view, setView] = useState<"front" | "back">("front");
  const [hover, setHover] = useState<string | null>(null);
  const interactive = !!onToggle;
  const regions = BODY_REGIONS.filter((r) => r.view === view);
  const hovered = regions.find((r) => r.id === hover);
  const countFor = (v: "front" | "back") =>
    BODY_REGIONS.filter((r) => r.view === v && marked[r.id]).length;

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div className="mb-3 inline-flex rounded-xl border border-line bg-surface-2 p-1 text-sm">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 font-medium capitalize transition",
              view === v ? "bg-ink text-bg" : "text-muted hover:text-ink",
            )}
          >
            {v}
            {countFor(v) > 0 && (
              <span className="rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">
                {countFor(v)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative w-full max-w-[260px]">
        <div className="pointer-events-none absolute inset-x-6 top-1/4 bottom-1/4 rounded-full bg-accent/10 blur-3xl" />
        <Figure view={view} className="relative w-full" fill="var(--color-surface-2)" stroke="var(--color-accent-dim)">
          {regions.map((r) => {
            const sev = marked[r.id];
            const color = sev ? SEVERITY_COLOR[sev] : undefined;
            return (
              <g
                key={r.id}
                transform={`translate(${r.x} ${r.y})`}
                className={cn(interactive && "cursor-pointer")}
                onClick={() => onToggle?.(r.id)}
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover(null)}
                role={interactive ? "button" : undefined}
                aria-label={r.label}
                aria-pressed={interactive ? !!sev : undefined}
                tabIndex={interactive ? 0 : undefined}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggle?.(r.id);
                  }
                }}
              >
                <circle r={14} fill="transparent" />
                {sev && (
                  <circle r={7} fill={color} className="origin-center animate-pulse-ring" style={{ transformBox: "fill-box" }} />
                )}
                <circle
                  r={sev ? 7 : hover === r.id ? 6 : interactive ? 4.5 : 0}
                  fill={sev ? color : hover === r.id ? "var(--color-accent)" : "var(--color-ink)"}
                  fillOpacity={sev ? 1 : 0.85}
                  stroke="var(--color-bg)"
                  strokeWidth={2}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}
        </Figure>
        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink shadow-xl"
            style={{ left: `${(hovered.x / 200) * 100}%`, top: `${(hovered.y / 400) * 100}%` }}
          >
            {hovered.label}
          </div>
        )}
      </div>
    </div>
  );
}
