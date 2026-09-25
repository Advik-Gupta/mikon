"use client";

import type { ReactNode } from "react";
import { Check, Minus, Plus, Repeat } from "lucide-react";
import { WEEKDAYS } from "@/lib/options";
import type { CycleType } from "@/lib/types";
import { StepHeader } from "../onboarding/StepHeader";
import { Chip, cn, Input, SectionLabel } from "../ui";
import type { BuilderStepProps } from "./Builder";

const LENGTHS = [4, 6, 8, 12, 16, 24];

function Cells({ n, cols, labels }: { n: number; cols?: number; labels?: string[] }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols ?? n}, minmax(0, 1fr))` }}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="flex h-7 items-center justify-center rounded-md bg-surface-3 text-[10px] font-medium text-muted transition group-aria-pressed:bg-accent/25 group-aria-pressed:text-accent"
        >
          {labels?.[i]}
        </span>
      ))}
    </div>
  );
}

function CycleCard({
  selected,
  onClick,
  title,
  text,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
      className={cn(
        "group relative flex cursor-pointer flex-col gap-4 rounded-2xl border p-5 text-left transition",
        selected
          ? "border-accent/70 bg-accent/[0.05] shadow-[0_0_0_4px_rgb(198_244_50/0.08)]"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
      )}
    >
      <span
        className={cn(
          "absolute right-4 top-4 flex size-5 items-center justify-center rounded-full border transition",
          selected ? "border-accent bg-accent text-accent-ink" : "border-line-strong text-transparent",
        )}
      >
        <Check className="size-3" strokeWidth={3.5} />
      </span>
      <div className="pr-8">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">{text}</p>
      </div>
      {children}
    </div>
  );
}

export function StructureStep({ program, update }: BuilderStepProps) {
  const s = program.structure;
  const set = (patch: Partial<typeof s>) => update((p) => ({ ...p, structure: { ...p.structure, ...patch } }));
  const setCycle = (cycle: CycleType) => {
    if (cycle === "weekly") set({ cycle, cycleDays: 7 });
    else if (cycle === "biweekly") set({ cycle, cycleDays: 14 });
    else if (cycle === "custom") set({ cycle, cycleDays: s.cycle === "custom" ? s.cycleDays : 4 });
    else set({ cycle });
  };
  const customLen = s.cycle === "custom" ? s.cycleDays : 4;

  const start = s.startDate ? new Date(`${s.startDate}T00:00`) : null;
  const end = start && s.lengthWeeks ? new Date(start.getTime() + s.lengthWeeks * 7 * 86400000) : null;
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <>
      <StepHeader
        icon={Repeat}
        eyebrow="Program · Structure"
        title="How is your training laid out?"
        subtitle="Choose a cycle that repeats, or build it day by day and see how it looks. You can add or remove days on the board later."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CycleCard selected={s.cycle === "weekly"} onClick={() => setCycle("weekly")} title="Weekly" text="The same 7-day week, repeated. The most common setup.">
          <Cells n={7} labels={WEEKDAYS.map((d) => d[0])} />
        </CycleCard>
        <CycleCard
          selected={s.cycle === "biweekly"}
          onClick={() => setCycle("biweekly")}
          title="Two-week"
          text="A 14-day rotation, e.g. alternating A and B weeks."
        >
          <Cells n={14} cols={7} labels={[...WEEKDAYS, ...WEEKDAYS].map((d) => d[0])} />
        </CycleCard>
        <CycleCard
          selected={s.cycle === "custom"}
          onClick={() => setCycle("custom")}
          title="Custom cycle"
          text="Any length that doesn't follow the calendar, like 3 on / 1 off or a 10-day rotation."
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Cells n={customLen} cols={Math.min(customLen, 10)} />
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-lg border border-line bg-surface-2 hover:bg-surface-3 disabled:opacity-30"
                disabled={customLen <= 2}
                onClick={() => set({ cycle: "custom", cycleDays: Math.max(2, customLen - 1) })}
                aria-label="Fewer days"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="w-12 text-center font-display text-sm font-semibold tabular-nums">{customLen} d</span>
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-lg border border-line bg-surface-2 hover:bg-surface-3 disabled:opacity-30"
                disabled={customLen >= 28}
                onClick={() => set({ cycle: "custom", cycleDays: Math.min(28, customLen + 1) })}
                aria-label="More days"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        </CycleCard>
        <CycleCard
          selected={s.cycle === "freeform"}
          onClick={() => setCycle("freeform")}
          title="Day by day"
          text="Skip the template. Add days one at a time and let the structure take shape on the board."
        >
          <div className="grid grid-cols-7 gap-1">
            <span className="flex h-7 items-center justify-center rounded-md bg-surface-3 text-[10px] font-medium text-muted transition group-aria-pressed:bg-accent/25 group-aria-pressed:text-accent">
              1
            </span>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="flex h-7 items-center justify-center rounded-md border border-dashed border-line-strong text-faint">
                {i === 0 && <Plus className="size-3" />}
              </span>
            ))}
          </div>
        </CycleCard>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_240px]">
        <div>
          <SectionLabel>Program length</SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            {LENGTHS.map((w) => (
              <Chip key={w} selected={s.lengthWeeks === w} onClick={() => set({ lengthWeeks: w })}>
                {w} weeks
              </Chip>
            ))}
            <Chip selected={s.lengthWeeks === null} onClick={() => set({ lengthWeeks: null })}>
              Ongoing
            </Chip>
            <div className="w-28">
              <Input
                type="number"
                min={1}
                max={104}
                className="h-9 text-sm"
                suffix="wk"
                placeholder="Custom"
                value={s.lengthWeeks != null && !LENGTHS.includes(s.lengthWeeks) ? s.lengthWeeks : ""}
                onChange={(e) => e.target.value && set({ lengthWeeks: Math.max(1, Math.min(104, Number(e.target.value))) })}
              />
            </div>
          </div>
        </div>
        <div>
          <SectionLabel>Start date</SectionLabel>
          <Input type="date" value={s.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </div>
      </div>

      {start && (
        <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-muted">
          Starts <span className="text-ink">{fmt(start)}</span>
          {end ? (
            <>
              {" "}
              · ends <span className="text-ink">{fmt(end)}</span>
            </>
          ) : (
            " · runs until you stop it"
          )}
          {s.cycle === "custom" && s.lengthWeeks && (
            <>
              {" "}
              · about <span className="text-ink">{Math.floor((s.lengthWeeks * 7) / s.cycleDays)}</span> rotations of your {s.cycleDays}-day cycle
            </>
          )}
        </p>
      )}
    </>
  );
}
