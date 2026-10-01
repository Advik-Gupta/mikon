"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { metricById, toDisplay, fromDisplay, unitFor } from "@/lib/measurements";
import { dayOf, deleteMeasurement, measurementId, saveMeasurement, useSeries } from "@/lib/measure-store";
import { toISODate } from "@/lib/programs";
import { useProfile } from "@/lib/storage";
import { Sheet } from "../tracker/Sheet";
import { toast } from "../Toaster";
import { Button } from "../ui";

export function EntrySheet({ metric, open, onClose, day: initialDay }: { metric: string | null; open: boolean; onClose: () => void; day?: string }) {
  return (
    <Sheet open={open && !!metric} onClose={onClose} title={metric ? metricById(metric)?.label : ""}>
      {metric && <EntryForm key={`${metric}-${initialDay ?? ""}`} metric={metric} initialDay={initialDay} onDone={onClose} />}
    </Sheet>
  );
}

function EntryForm({ metric, initialDay, onDone }: { metric: string; initialDay?: string; onDone: () => void }) {
  const def = metricById(metric)!;
  const units = useProfile()?.body.units ?? "metric";
  const series = useSeries(metric);
  const fat = useSeries("bodyFat");
  const [day, setDay] = useState(initialDay ?? toISODate(new Date()));
  const existing = series.find((m) => dayOf(m.date) === day);
  const last = series.at(-1);
  const show = (v: number | undefined, kind = def.kind) => (v == null ? "" : String(Math.round(toDisplay(kind, v, units) * 10) / 10));
  const [value, setValue] = useState(show(existing?.value));
  const [bf, setBf] = useState(show(fat.find((m) => dayOf(m.date) === day)?.value, "percent"));
  const unit = unitFor(def.kind, units);

  const save = () => {
    const n = Number(value);
    if (!value || !Number.isFinite(n) || n <= 0) return toast({ tone: "warn", title: `Enter your ${def.label.toLowerCase()}` });
    saveMeasurement(metric, day, fromDisplay(def.kind, n, units));
    if (metric === "weight" && bf && Number(bf) > 0) saveMeasurement("bodyFat", day, Number(bf));
    toast({ tone: "success", title: `${def.label} saved` });
    onDone();
  };

  const input = "h-14 w-full rounded-2xl border-2 border-line bg-surface-2 px-4 pr-14 font-display text-2xl font-semibold tabular-nums outline-none focus:border-ink";

  return (
    <div className="px-5 pb-6">
      <input
        type="date"
        value={day}
        max={toISODate(new Date())}
        onChange={(e) => {
          setDay(e.target.value);
          const hit = series.find((m) => dayOf(m.date) === e.target.value);
          setValue(show(hit?.value));
        }}
        className="mb-4 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-center text-sm outline-none focus:border-accent/60"
      />
      <div className={metric === "weight" ? "grid grid-cols-[1.4fr_1fr] gap-3" : ""}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">{def.label}</span>
          <span className="relative block">
            <input autoFocus type="number" inputMode="decimal" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} placeholder={show(last?.value) || "0"} className={input} />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-muted">{unit}</span>
          </span>
        </label>
        {metric === "weight" && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Body fat</span>
            <span className="relative block">
              <input type="number" inputMode="decimal" step="0.1" value={bf} onChange={(e) => setBf(e.target.value)} placeholder="-" className={input} />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-muted">%</span>
            </span>
          </label>
        )}
      </div>
      <Button className="mt-5 h-12 w-full rounded-full text-[15px]" onClick={save}>
        Save
      </Button>
      {existing && (
        <Button
          variant="ghost"
          className="mt-2 h-11 w-full text-danger"
          onClick={() => {
            deleteMeasurement(measurementId(metric, day));
            onDone();
          }}
        >
          <Trash2 className="size-4" /> Delete this entry
        </Button>
      )}
    </div>
  );
}
