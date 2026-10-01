"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { EntrySheet } from "@/components/body/EntrySheet";
import { latestByMetric } from "@/lib/measure-store";
import { METRICS, fmtMetric, toDisplay } from "@/lib/measurements";
import { useMeasurements, useProfile } from "@/lib/storage";
import { cn } from "@/components/ui";
import { Guide } from "@/components/tour/Guide";
import { GUIDES } from "@/components/tour/guides";

export default function BodyPage() {
  const all = useMeasurements();
  const units = useProfile()?.body.units ?? "metric";
  const latest = latestByMetric(all);
  const [adding, setAdding] = useState<string | null>(null);

  const section = (group: "core" | "body", title: string) => (
    <section className="mt-6">
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">{title}</h3>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {METRICS.filter((m) => m.group === group).map((m, i) => {
          const hit = latest.get(m.id);
          const delta = hit?.prev ? toDisplay(m.kind, hit.last.value, units) - toDisplay(m.kind, hit.prev.value, units) : 0;
          return (
            <motion.li key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="flex items-center">
              <Link href={`/body/${m.id}`} data-tour="body-metric" className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pl-4 transition active:bg-surface-2">
                <span className="flex-1 text-[16px] font-semibold">{m.label}</span>
                {hit && (
                  <span className="flex items-center gap-2 text-right">
                    {Math.abs(delta) >= 0.05 && (
                      <span className={cn("flex items-center gap-0.5 text-[11px]", delta > 0 ? "text-warn" : "text-info")}>
                        {delta > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {Math.abs(Math.round(delta * 10) / 10)}
                      </span>
                    )}
                    <span className="text-[15px] tabular-nums text-muted">{fmtMetric(m.kind, hit.last.value, units)}</span>
                  </span>
                )}
                <ChevronRight className="size-4 shrink-0 text-faint" />
              </Link>
              <button
                type="button"
                data-tour="body-add"
                onClick={() => setAdding(m.id)}
                className="mx-3 flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent transition active:scale-90"
                aria-label={`Log ${m.label}`}
              >
                <Plus className="size-5" strokeWidth={2.5} />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="board-grid min-h-full">
      <Guide id="body" steps={GUIDES.body} />
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Body</h2>
        <p className="mt-1 text-sm text-muted">Log your weight and measurements. Tap any row to see how it&apos;s changed.</p>
        {section("core", "Core")}
        {section("body", "Body parts")}
      </div>
      <EntrySheet metric={adding} open={!!adding} onClose={() => setAdding(null)} />
    </div>
  );
}
