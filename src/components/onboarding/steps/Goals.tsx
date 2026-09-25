"use client";

import { AnimatePresence, motion, Reorder } from "motion/react";
import { GripVertical, ListOrdered, Target, X } from "lucide-react";
import { GOALS, TIMEFRAMES, WEIGHT_GOALS } from "@/lib/options";
import { Chip, cn, Field, SectionLabel, Textarea } from "@/components/ui";
import { StepHeader } from "../StepHeader";
import { WeightInput } from "@/components/inputs";
import type { StepProps } from "../defaults";

const goal = (id: string) => GOALS.find((g) => g.id === id);

export function GoalsStep({ draft, update }: StepProps) {
  const g = draft.goals;
  const set = (patch: Partial<typeof g>) => update("goals", patch);
  const rank = (id: string) => g.ranked.indexOf(id);
  const toggleGoal = (id: string) =>
    set({ ranked: g.ranked.includes(id) ? g.ranked.filter((x) => x !== id) : [...g.ranked, id] });

  return (
    <>
      <StepHeader
        icon={Target}
        eyebrow="Training · Goals"
        title="What are you working towards?"
        subtitle="Tap your goals in order of priority. Your first pick is your top priority. Drag in the list to re-order."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {GOALS.map((o) => {
            const r = rank(o.id);
            const selected = r !== -1;
            const Icon = o.icon!;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleGoal(o.id)}
                aria-pressed={selected}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                  selected
                    ? "border-accent/70 bg-accent/[0.07] shadow-[0_0_0_4px_rgb(198_244_50/0.08)]"
                    : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition",
                    selected ? "bg-accent text-accent-ink" : "bg-surface-3 text-ink/80 group-hover:text-ink",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 pr-5 text-sm font-medium leading-tight">{o.label}</span>
                <AnimatePresence>
                  {selected && (
                    <motion.span
                      key={r}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ type: "spring", bounce: 0.5, duration: 0.35 }}
                      className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-accent font-display text-xs font-bold text-accent-ink shadow-[0_0_0_3px_var(--color-bg)]"
                    >
                      {r + 1}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-0">
          <SectionLabel className="flex items-center gap-2">
            <ListOrdered className="size-3.5" /> Your priorities
          </SectionLabel>
          {g.ranked.length === 0 ? (
            <p className="py-6 text-center text-sm text-faint">Tap a goal to make it priority #1.</p>
          ) : (
            <Reorder.Group axis="y" values={g.ranked} onReorder={(ranked) => set({ ranked })} className="space-y-1.5">
              {g.ranked.map((id, i) => {
                const o = goal(id);
                if (!o) return null;
                return (
                  <Reorder.Item
                    key={id}
                    value={id}
                    className={cn(
                      "flex cursor-grab items-center gap-2.5 rounded-xl border bg-surface-2 px-2.5 py-2 active:cursor-grabbing",
                      i === 0 ? "border-accent/50" : "border-line",
                    )}
                  >
                    <GripVertical className="size-3.5 shrink-0 text-faint" />
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold",
                        i === 0 ? "bg-accent text-accent-ink" : "bg-surface-3 text-ink",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{o.label}</span>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => toggleGoal(id)}
                      className="rounded p-0.5 text-faint hover:text-ink"
                      aria-label={`Remove ${o.label}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          )}
        </aside>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div>
          <SectionLabel>Timeframe</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {TIMEFRAMES.map((t) => (
              <Chip key={t.id} selected={g.timeframe === t.id} onClick={() => set({ timeframe: t.id })}>
                {t.label}
              </Chip>
            ))}
          </div>
        </div>
        {g.ranked.some((id) => WEIGHT_GOALS.includes(id)) && (
          <Field label="Target body weight" optional>
            <WeightInput kg={g.targetWeightKg} units={draft.body.units} onChange={(targetWeightKg) => set({ targetWeightKg })} />
          </Field>
        )}
      </div>

      <Field label="Why does this matter to you?" optional className="mt-8">
        <Textarea
          value={g.motivation}
          onChange={(e) => set({ motivation: e.target.value })}
          placeholder="e.g. Keep up with my kids, make varsity, finally deadlift 2× bodyweight…"
        />
      </Field>
    </>
  );
}
