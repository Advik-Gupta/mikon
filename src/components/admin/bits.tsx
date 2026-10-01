"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../ui";

export const CHART = { lime: "#c6f432", blue: "#5aaeff", violet: "#a78bfa", orange: "#ff9a6b", pink: "#ff6b8a", teal: "#3dd6d0", grid: "#252a31", text: "#8a919c" };
export const PALETTE = [CHART.lime, CHART.blue, CHART.violet, CHART.orange, CHART.pink, CHART.teal];

export const tooltipStyle = {
  contentStyle: { background: "#171a1f", border: "1px solid #333a43", borderRadius: 12, fontSize: 12 },
  labelStyle: { color: "#eceef1" },
  itemStyle: { color: "#eceef1" },
};

export function Kpi({ icon: Icon, label, value, sub, tone = "lime" }: { icon: LucideIcon; label: string; value: ReactNode; sub?: string; tone?: keyof typeof CHART }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="size-3.5" style={{ color: CHART[tone] }} /> {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-faint">{sub}</p>}
    </div>
  );
}

export function Panel({ title, sub, children, className, aside }: { title: string; sub?: string; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const bytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

export const ago = (iso: string | null) => {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
};
