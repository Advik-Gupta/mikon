"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dumbbell, Footprints, Gauge, Plus } from "lucide-react";
import { ACTIVITY_LEVELS, EXPERIENCE_LEVELS, MODALITIES, RECORDS, SPORTS } from "@/lib/options";
import type { PersonalRecord } from "@/lib/types";
import { DurationInput, WeightInput } from "@/components/inputs";
import { Chip, cn, Input, OptionCard, SectionLabel, toggle } from "@/components/ui";
import { StepHeader } from "../StepHeader";
import type { StepProps } from "../defaults";

function LevelBars({ n, active }: { n: number; active: boolean }) {
  return (
    <span className="flex h-7 items-end gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn("w-1.5 rounded-full transition", i <= n ? (active ? "bg-accent" : "bg-ink/70") : "bg-surface-3")}
          style={{ height: `${8 + i * 4}px` }}
        />
      ))}
    </span>
  );
}

export function ExperienceStep({ draft, update }: StepProps) {
  const e = draft.experience;
  const set = (patch: Partial<typeof e>) => update("experience", patch);
  const years = e.yearsTraining;

  return (
    <>
      <StepHeader
        icon={Gauge}
        eyebrow="Training · Experience"
        title="How experienced are you?"
        subtitle="This sets starting volume, exercise complexity and how quickly your programs progress."
      />
      <div className="grid gap-3 sm:grid-cols-5">
        {EXPERIENCE_LEVELS.map((l) => (
          <OptionCard
            key={l.id}
            selected={e.level === l.id}
            onClick={() => set({ level: l.id })}
            label={l.label}
            description={l.description}
          >
            <LevelBars n={l.bars} active={e.level === l.id} />
          </OptionCard>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Years of consistent training</span>
          <span className="font-display text-2xl font-semibold tabular-nums">
            {years >= 20 ? "20+" : years}
            <span className="ml-1 text-sm font-normal text-muted">{years === 1 ? "year" : "years"}</span>
          </span>
        </div>
        <input
          type="range"
          className="range mt-3"
          min={0}
          max={20}
          step={0.5}
          value={years}
          style={{ ["--fill" as string]: `${(years / 20) * 100}%` }}
          onChange={(ev) => set({ yearsTraining: Number(ev.target.value) })}
          aria-label="Years of training"
        />
        <div className="flex justify-between text-[11px] text-faint">
          <span>Just starting</span>
          <span>5</span>
          <span>10</span>
          <span>15</span>
          <span>20+</span>
        </div>
      </div>

      <h2 className="mb-1 mt-10 text-lg font-semibold">Daily activity outside training</h2>
      <p className="mb-4 text-sm text-muted">Affects recovery capacity and energy needs.</p>
      <div className="grid gap-3 sm:grid-cols-4">
        {ACTIVITY_LEVELS.map((a, i) => (
          <OptionCard
            key={a.id}
            selected={e.activityLevel === a.id}
            onClick={() => set({ activityLevel: a.id })}
            label={a.label}
            description={a.description}
          >
            <span className="flex gap-0.5">
              {[0, 1, 2, 3].map((d) => (
                <span key={d} className={cn("size-1.5 rounded-full", d <= i ? "bg-accent" : "bg-surface-3")} />
              ))}
            </span>
          </OptionCard>
        ))}
      </div>

      <RecordsSection draft={draft} update={update} />
    </>
  );
}

function RecordsSection({ draft, update }: StepProps) {
  const records = draft.experience.records;
  const units = draft.body.units;
  const setRecord = (id: string, patch: Partial<PersonalRecord>) =>
    update("experience", {
      records: { ...records, [id]: { ...(records[id] ?? { value: null, never: false }), ...patch } },
    });
  const allNever = (kind: "lift" | "run") => RECORDS.filter((r) => r.kind === kind).every((r) => records[r.id]?.never);
  const setAllNever = (kind: "lift" | "run", never: boolean) => {
    const next = { ...records };
    RECORDS.filter((r) => r.kind === kind).forEach((r) => (next[r.id] = { value: never ? null : (next[r.id]?.value ?? null), never }));
    update("experience", { records: next });
  };

  const group = (kind: "lift" | "run", title: string, hint: string, Icon: typeof Dumbbell) => (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-surface-3 text-accent">
            <Icon className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-muted">{hint}</p>
          </div>
        </div>
        <Chip selected={allNever(kind)} onClick={() => setAllNever(kind, !allNever(kind))}>
          Never trained these
        </Chip>
      </div>
      <div className="space-y-2.5">
        {RECORDS.filter((r) => r.kind === kind).map((r) => {
          const rec = records[r.id] ?? { value: null, never: false };
          return (
            <div key={r.id} className="grid grid-cols-[96px_1fr_auto] items-center gap-3">
              <span className={cn("text-sm", rec.never ? "text-faint line-through" : "text-ink")}>{r.label}</span>
              {kind === "lift" ? (
                <WeightInput kg={rec.value} units={units} disabled={rec.never} onChange={(value) => setRecord(r.id, { value })} />
              ) : (
                <DurationInput seconds={rec.value} disabled={rec.never} onChange={(value) => setRecord(r.id, { value })} />
              )}
              <button
                type="button"
                onClick={() => setRecord(r.id, { never: !rec.never, value: rec.never ? rec.value : null })}
                className={cn(
                  "whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                  rec.never ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
                )}
              >
                Never done
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <h2 className="mb-1 mt-10 text-lg font-semibold">Personal records</h2>
      <p className="mb-4 text-sm text-muted">
        Your bests so far. Leave blank if you&apos;re not sure, or mark <span className="text-ink">Never done</span> if you haven&apos;t tried it.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {group("lift", "Lifts", "Heaviest single rep", Dumbbell)}
        {group("run", "Runs", "Fastest time (h : mm : ss)", Footprints)}
      </div>
    </>
  );
}

export function ModalitiesStep({ draft, update }: StepProps) {
  const t = draft.training;
  const set = (patch: Partial<typeof t>) => update("training", patch);
  const [custom, setCustom] = useState("");
  const allSports = [...SPORTS, ...t.sports.filter((s) => !SPORTS.includes(s))];

  const addCustom = () => {
    const v = custom.trim();
    if (v && !t.sports.includes(v)) set({ sports: [...t.sports, v] });
    setCustom("");
  };

  return (
    <>
      <StepHeader
        icon={Dumbbell}
        eyebrow="Training · Disciplines"
        title="What kinds of training do you do?"
        subtitle="Pick the broad types of training you do or want to do. You'll get into specifics, like events and styles, when you build a program."
      />
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted">
          <span className="font-semibold text-ink">{t.modalities.length}</span> selected
        </span>
        {t.modalities.length > 0 && (
          <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => set({ modalities: [] })}>
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {MODALITIES.map((m) => (
          <OptionCard
            key={m.id}
            multi
            icon={m.icon}
            selected={t.modalities.includes(m.id)}
            onClick={() => set({ modalities: toggle(t.modalities, m.id) })}
            label={m.label}
            description={m.description}
          />
        ))}
      </div>

      <AnimatePresence>
        {t.modalities.includes("sports") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
              <SectionLabel>Which sports?</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {allSports.map((s) => (
                  <Chip key={s} selected={t.sports.includes(s)} onClick={() => set({ sports: toggle(t.sports, s) })}>
                    {s}
                  </Chip>
                ))}
              </div>
              <form
                className="mt-4 flex max-w-sm gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  addCustom();
                }}
              >
                <Input className="h-9 text-sm" placeholder="Add another sport" value={custom} onChange={(e) => setCustom(e.target.value)} />
                <button type="submit" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2 hover:bg-surface-3" aria-label="Add sport">
                  <Plus className="size-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
