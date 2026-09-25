"use client";

import { motion } from "motion/react";
import { Percent, Ruler } from "lucide-react";
import {
  bmi,
  bmiLabel,
  bodyFatBands,
  fatBand,
  navyBodyFat,
  defaultBodyFat,
  round1,
} from "@/lib/body";
import { BODY_FAT_METHODS } from "@/lib/options";
import type { BodyFatMethod, Units } from "@/lib/types";
import { cn, Field, NumberInput, OptionCard, Segmented } from "@/components/ui";
import { HeightInput, LengthInput, WeightInput } from "@/components/inputs";
import { StepHeader } from "../StepHeader";
import type { StepProps } from "../defaults";

const UNIT_OPTS: { id: Units; label: string }[] = [
  { id: "metric", label: "Metric" },
  { id: "imperial", label: "Imperial" },
];

export function BodyMetricsStep({ draft, update }: StepProps) {
  const b = draft.body;
  const set = (patch: Partial<typeof b>) => update("body", patch);
  const bmiValue = bmi(b.heightCm, b.weightKg);
  // BMI gauge spans 15–40
  const gaugePct = bmiValue ? Math.min(100, Math.max(0, ((bmiValue - 15) / 25) * 100)) : null;

  return (
    <>
      <StepHeader
        icon={Ruler}
        eyebrow="Your body · Measurements"
        title="Your body, by the numbers"
        subtitle="Height and weight drive load recommendations and energy estimates."
      />
      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="text-sm text-muted">Units</span>
        <Segmented options={UNIT_OPTS} value={b.units} onChange={(units) => set({ units })} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Height">
          <HeightInput cm={b.heightCm} units={b.units} onChange={(heightCm) => set({ heightCm })} />
        </Field>
        <Field label="Weight">
          <WeightInput kg={b.weightKg} units={b.units} onChange={(weightKg) => set({ weightKg })} />
        </Field>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Body mass index</span>
          <span className="text-sm text-muted">{bmiValue ? bmiLabel(bmiValue) : "Enter height & weight"}</span>
        </div>
        <div className="mt-2 font-display text-3xl font-semibold tabular-nums">{bmiValue ?? "—"}</div>
        <div className="relative mt-3 h-2 rounded-full bg-gradient-to-r from-info via-accent via-45% to-danger">
          {gaugePct != null && (
            <motion.span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-bg bg-ink"
              animate={{ left: `${gaugePct}%` }}
              transition={{ type: "spring", bounce: 0.3 }}
            />
          )}
        </div>
        <p className="mt-2 text-xs text-faint">BMI ignores muscle mass, so treat it as a rough reference only.</p>
      </div>

    </>
  );
}

export function CompositionStep({ draft, update }: StepProps) {
  const b = draft.body;
  const sex = draft.personal.sex;
  const set = (patch: Partial<typeof b>) => update("body", patch);
  const bands = bodyFatBands(sex);
  const isFemale = sex === "female";

  const navy = navyBodyFat(sex, b.heightCm, b.waistCm, b.neckCm, b.hipCm);
  const bf =
    b.bodyFatMethod === "navy"
      ? navy
      : b.bodyFatMethod === "unknown"
        ? null
        : b.bodyFatMethod === "visual"
          ? (b.bodyFat ?? defaultBodyFat(sex))
          : b.bodyFat;
  const shown = bf ?? defaultBodyFat(sex);
  const band = fatBand(sex, shown);
  const min = 3;
  const max = 50;
  const fill = ((shown - min) / (max - min)) * 100;

  const setMethod = (m: BodyFatMethod) => {
    if (m === "unknown") set({ bodyFatMethod: m, bodyFat: null });
    else if (m === "visual" && b.bodyFat == null) set({ bodyFatMethod: m, bodyFat: defaultBodyFat(sex) });
    else set({ bodyFatMethod: m });
  };

  return (
    <>
      <StepHeader
        icon={Percent}
        eyebrow="Your body · Composition"
        title="Body fat estimate"
        subtitle="A rough number is fine. It helps separate muscle from fat when we estimate your needs."
      />
      <div className="grid gap-3 sm:grid-cols-4">
        {BODY_FAT_METHODS.map((m) => (
          <OptionCard
            key={m.id}
            selected={b.bodyFatMethod === m.id}
            onClick={() => setMethod(m.id as BodyFatMethod)}
            label={m.label}
            description={m.description}
          />
        ))}
      </div>

      <div
        className={cn(
          "mt-6 rounded-3xl border border-line bg-surface p-6 transition sm:p-8",
          b.bodyFatMethod === "unknown" && "opacity-40",
        )}
      >
        <div>
          <div className="flex items-end gap-3">
            <span className="font-display text-6xl font-semibold tabular-nums tracking-tight">
              {bf != null ? round1(bf) : "—"}
              <span className="text-3xl text-muted">%</span>
            </span>
            {bf != null && (
              <span className="mb-2 rounded-full px-2.5 py-0.5 text-xs font-semibold text-accent-ink" style={{ background: band.color }}>
                {band.label}
              </span>
            )}
          </div>

          {b.bodyFatMethod === "visual" && (
            <div className="mt-5">
              <input
                type="range"
                className="range"
                min={min}
                max={max}
                step={0.5}
                value={shown}
                style={{ ["--fill" as string]: `${fill}%` }}
                onChange={(e) => set({ bodyFat: Number(e.target.value) })}
                aria-label="Body fat percentage"
              />
            </div>
          )}

          {b.bodyFatMethod === "measured" && (
            <div className="mt-5 max-w-40">
              <NumberInput suffix="%" value={b.bodyFat} onChange={(v) => set({ bodyFat: v })} placeholder="15" />
            </div>
          )}

          {b.bodyFatMethod === "navy" && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Field label="Waist" hint="At the navel">
                <LengthInput cm={b.waistCm} units={b.units} onChange={(waistCm) => set({ waistCm })} />
              </Field>
              <Field label="Neck" hint="Below the larynx">
                <LengthInput cm={b.neckCm} units={b.units} onChange={(neckCm) => set({ neckCm })} />
              </Field>
              {isFemale && (
                <Field label="Hips" hint="Widest point">
                  <LengthInput cm={b.hipCm} units={b.units} onChange={(hipCm) => set({ hipCm })} />
                </Field>
              )}
              {!b.heightCm && <p className="text-xs text-warn sm:col-span-3">Add your height on the previous step to calculate.</p>}
            </div>
          )}

          <div className="mt-6">
            <div className="flex h-2 overflow-hidden rounded-full">
              {bands.map((bd, i) => {
                const lo = i === 0 ? min : bands[i - 1].max;
                const hi = Math.min(bd.max, max);
                return <span key={bd.label} style={{ flex: hi - lo, background: bd.color, opacity: bd === band ? 1 : 0.35 }} />;
              })}
            </div>
            <div className="mt-2 flex text-[11px] text-faint">
              {bands.map((bd, i) => {
                const lo = i === 0 ? min : bands[i - 1].max;
                const hi = Math.min(bd.max, max);
                return (
                  <span key={bd.label} style={{ flex: hi - lo }} className={cn("truncate", bd === band && "text-ink")}>
                    {bd.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
