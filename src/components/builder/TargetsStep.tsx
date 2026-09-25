"use client";

import { AnimatePresence, motion } from "motion/react";
import { Crosshair, Plus, Trash2 } from "lucide-react";
import { fmtClock, kgToLb, round1 } from "@/lib/body";
import { TARGET_METRICS, type TargetMetric } from "@/lib/options";
import { useProfile } from "@/lib/storage";
import type { Profile, ProgramTarget, Units } from "@/lib/types";
import { DurationInput, WeightInput } from "../inputs";
import { StepHeader } from "../onboarding/StepHeader";
import { cn, Input, NumberInput } from "../ui";
import type { BuilderStepProps } from "./Builder";

const metricOf = (id: string) => TARGET_METRICS.find((m) => m.id === id);

function currentFromProfile(m: TargetMetric, profile: Profile | null | undefined) {
  if (!profile) return null;
  if (m.record) return profile.experience.records[m.record]?.value ?? null;
  if (m.id === "bodyweight") return profile.body.weightKg;
  if (m.id === "bodyfat") return profile.body.bodyFat;
  return null;
}

function Delta({ t, units }: { t: ProgramTarget; units: Units }) {
  const m = metricOf(t.metric);
  if (t.current == null || t.target == null) return null;
  const d = t.target - t.current;
  if (d === 0) return <span className="text-xs text-muted">Hold steady</span>;
  let text: string;
  if (m?.kind === "time") text = `${d < 0 ? "−" : "+"}${fmtClock(Math.abs(d))} ${d < 0 ? "faster" : "slower"}`;
  else if (m?.kind === "weight") {
    const v = units === "metric" ? round1(Math.abs(d)) : Math.round(kgToLb(Math.abs(d)));
    text = `${d > 0 ? "+" : "−"}${v} ${units === "metric" ? "kg" : "lb"}`;
  } else if (m?.kind === "percent") text = `${d > 0 ? "+" : "−"}${round1(Math.abs(d))}%`;
  else text = `${d > 0 ? "+" : "−"}${round1(Math.abs(d))} ${t.unit}`;
  const good = m?.kind === "time" ? d < 0 : true;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", good ? "bg-accent/12 text-accent" : "bg-warn/12 text-warn")}>
      {text}
    </span>
  );
}

function ValueInput({
  t,
  field,
  units,
  onChange,
}: {
  t: ProgramTarget;
  field: "current" | "target";
  units: Units;
  onChange: (v: number | null) => void;
}) {
  const m = metricOf(t.metric);
  const v = t[field];
  if (m?.kind === "weight") return <WeightInput kg={v} units={units} onChange={onChange} />;
  if (m?.kind === "time") return <DurationInput seconds={v} onChange={onChange} />;
  return <NumberInput suffix={m?.kind === "percent" ? "%" : t.unit || undefined} value={v} onChange={onChange} />;
}

export function TargetsStep({ program, update }: BuilderStepProps) {
  const profile = useProfile();
  const units = profile?.body.units ?? "metric";
  const goalIds = program.goals.map((g) => g.id);
  const setTargets = (targets: ProgramTarget[]) => update((p) => ({ ...p, targets }));
  const patch = (id: string, patch: Partial<ProgramTarget>) =>
    setTargets(program.targets.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const available = TARGET_METRICS.filter((m) => !program.targets.some((t) => t.metric === m.id))
    .map((m) => ({ m, suggested: m.goals.some((g) => goalIds.includes(g)) }))
    .sort((a, b) => Number(b.suggested) - Number(a.suggested));

  const add = (metric: string) => {
    const m = metricOf(metric);
    const t: ProgramTarget = {
      id: crypto.randomUUID(),
      metric,
      label: "",
      unit: "",
      current: m ? currentFromProfile(m, profile) : null,
      target: null,
      byDate: "",
    };
    setTargets([...program.targets, t]);
  };

  return (
    <>
      <StepHeader
        icon={Crosshair}
        eyebrow="Program · Targets"
        title="Any numbers you're chasing?"
        subtitle="Optional. Add measurable targets like PRs, race times, body weight or body fat. Current values come from your profile."
      />

      <div className="flex flex-wrap gap-2">
        {available.map(({ m, suggested }) => (
          <button
            key={m.id}
            type="button"
            onClick={() => add(m.id)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink/85 transition hover:border-line-strong hover:text-ink"
          >
            <Plus className="size-3.5 text-muted" />
            {m.label}
            {suggested && <span className="size-1.5 rounded-full bg-accent" title="Fits your goals" />}
          </button>
        ))}
        <button
          type="button"
          onClick={() => add("custom")}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3.5 py-1.5 text-sm text-muted transition hover:text-ink"
        >
          <Plus className="size-3.5" /> Custom target
        </button>
      </div>
      {available.some((a) => a.suggested) && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-faint">
          <span className="size-1.5 rounded-full bg-accent" /> Fits your program goals
        </p>
      )}

      {program.targets.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-14 text-center">
          <Crosshair className="size-7 text-faint" />
          <p className="mt-3 text-sm font-medium">No targets yet</p>
          <p className="mt-1 max-w-sm text-[13px] text-muted">Targets are optional. Skip this step if your goals aren&apos;t about specific numbers.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {program.targets.map((t) => {
              const m = metricOf(t.metric);
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="rounded-2xl border border-line bg-surface p-4"
                >
                  <div className="mb-4 flex items-center gap-2">
                    {m ? (
                      <span className="flex-1 font-medium">{m.label}</span>
                    ) : (
                      <div className="grid flex-1 grid-cols-[1fr_80px] gap-2">
                        <Input className="h-9 text-sm" placeholder="e.g. Pull-ups" value={t.label} onChange={(e) => patch(t.id, { label: e.target.value })} />
                        <Input className="h-9 text-sm" placeholder="unit" value={t.unit} onChange={(e) => patch(t.id, { unit: e.target.value })} />
                      </div>
                    )}
                    <Delta t={t} units={units} />
                    <button
                      type="button"
                      onClick={() => setTargets(program.targets.filter((x) => x.id !== t.id))}
                      className="rounded-lg p-1.5 text-faint hover:bg-danger/10 hover:text-danger"
                      aria-label="Remove target"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-[52px_1fr] items-center gap-x-3 gap-y-2">
                    <span className="text-xs text-muted">Now</span>
                    <ValueInput t={t} field="current" units={units} onChange={(current) => patch(t.id, { current })} />
                    <span className="text-xs font-medium text-accent">Target</span>
                    <ValueInput t={t} field="target" units={units} onChange={(target) => patch(t.id, { target })} />
                  </div>
                  <label className="mt-2 grid grid-cols-[52px_1fr] items-center gap-x-3 text-xs text-muted">
                    By
                    <Input type="date" className="h-10 text-sm" value={t.byDate} onChange={(e) => patch(t.id, { byDate: e.target.value })} />
                  </label>
                  {m?.record && t.current == null && profile && (
                    <p className="mt-2 text-[11px] text-faint">
                      No {m.kind === "time" ? "time" : "PR"} on your profile.{" "}
                      {profile.experience.records[m.record]?.never ? "You marked this as never done." : ""}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
