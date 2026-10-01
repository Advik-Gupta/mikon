"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { EntrySheet } from "@/components/body/EntrySheet";
import { ProgressChart } from "@/components/social/ProgressChart";
import { Button, cn } from "@/components/ui";
import { dayOf, movingAverage, useSeries } from "@/lib/measure-store";
import { fmtMetric, metricById, toDisplay, unitFor } from "@/lib/measurements";
import { addDays, parseISODate, toISODate } from "@/lib/programs";
import { useProfile } from "@/lib/storage";
import { Guide } from "@/components/tour/Guide";
import { GUIDES } from "@/components/tour/guides";

const RANGES = [
  { id: "1m", label: "1M", days: 31 },
  { id: "3m", label: "3M", days: 92 },
  { id: "6m", label: "6M", days: 183 },
  { id: "1y", label: "1Y", days: 366 },
  { id: "all", label: "All", days: 0 },
];

export default function MetricPage() {
  const { metric } = useParams<{ metric: string }>();
  const def = metricById(metric);
  const units = useProfile()?.body.units ?? "metric";
  const series = useSeries(metric);
  const [range, setRange] = useState("all");
  const [entry, setEntry] = useState<{ day?: string } | null>(null);

  const days = RANGES.find((r) => r.id === range)!.days;
  const from = days ? toISODate(addDays(new Date(), -days)) : "";
  const points = useMemo(() => {
    const byDay = new Map<string, number>();
    series.forEach((m) => byDay.set(dayOf(m.date), m.value));
    return [...byDay.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
  }, [series]);
  const shown = points.filter((p) => p.date >= from);
  if (!def) return null;

  const disp = (v: number) => Math.round(toDisplay(def.kind, v, units) * 10) / 10;
  const unit = unitFor(def.kind, units);
  const fmt = (v: number) => `${Math.round(v * 10) / 10} ${unit}`;
  const chartPoints = shown.map((p) => ({ date: p.date, value: disp(p.value) }));
  const trend = metric === "weight" ? movingAverage(chartPoints) : null;
  const last = points.at(-1);
  const first = shown[0];
  const change = last && first && shown.length > 1 ? disp(last.value) - disp(first.value) : null;

  return (
    <div className="board-grid min-h-full">
      <Guide id="metric" steps={GUIDES.metric} />
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-5 sm:px-8 sm:pt-8">
        <Link href="/body" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Body
        </Link>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">{def.label}</h2>
            <p className="mt-1 font-display text-4xl font-semibold tabular-nums">{last ? fmtMetric(def.kind, last.value, units) : "-"}</p>
            {change != null && (
              <p className={cn("mt-1 text-sm", Math.abs(change) < 0.05 ? "text-muted" : change > 0 ? "text-warn" : "text-info")}>
                {change > 0 ? "+" : ""}
                {Math.round(change * 10) / 10} {unit} over {RANGES.find((r) => r.id === range)!.label === "All" ? "all time" : `the last ${RANGES.find((r) => r.id === range)!.label}`}
              </p>
            )}
          </div>
          <Button data-tour="metric-add" onClick={() => setEntry({})} className="shrink-0 rounded-full">
            <Plus className="size-4" /> Log
          </Button>
        </div>

        <div data-tour="metric-range" className="mt-5 flex gap-1 rounded-2xl border border-line bg-surface p-1">
          {RANGES.map((r) => (
            <button key={r.id} type="button" onClick={() => setRange(r.id)} className={cn("flex-1 rounded-xl py-2 text-sm font-medium transition", range === r.id ? "bg-ink text-bg" : "text-muted")}>
              {r.label}
            </button>
          ))}
        </div>

        <section className="mt-4 rounded-3xl border border-line bg-surface p-4">
          {chartPoints.length ? (
            <ProgressChart
              series={[
                { id: "v", label: def.label, color: "#a78bfa", points: chartPoints },
                ...(trend && chartPoints.length > 2 ? [{ id: "t", label: "Trend", color: "#c6f432", points: trend }] : []),
              ]}
              format={fmt}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted">{points.length ? "No entries in this range." : "No entries yet. Log your first one."}</p>
          )}
        </section>

        {points.length > 0 && (
          <section className="mt-5">
            <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Entries</h3>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {[...points].reverse().slice(0, 120).map((p, i, arr) => {
                const prev = arr[i + 1];
                const d = prev ? disp(p.value) - disp(prev.value) : 0;
                return (
                  <li key={p.date}>
                    <button type="button" onClick={() => setEntry({ day: p.date })} className="flex w-full items-center justify-between px-4 py-3 text-left active:bg-surface-2">
                      <span className="text-sm">{parseISODate(p.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="flex items-center gap-3">
                        {prev && Math.abs(d) >= 0.05 && <span className={cn("text-xs tabular-nums", d > 0 ? "text-warn" : "text-info")}>{d > 0 ? "+" : ""}{Math.round(d * 10) / 10}</span>}
                        <span className="font-medium tabular-nums">{fmtMetric(def.kind, p.value, units)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
      <EntrySheet metric={metric} open={!!entry} day={entry?.day} onClose={() => setEntry(null)} />
    </div>
  );
}
