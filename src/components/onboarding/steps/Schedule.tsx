"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, Moon, MousePointerClick, Sunrise, Trash2, Zap } from "lucide-react";
import { BUSY_CATEGORIES, busyCategory, WEEKDAYS } from "@/lib/options";
import { daysLabel, fmtDuration, fmtRange, fmtTime, freeMinutesByDay, TIME_OPTIONS } from "@/lib/schedule";
import type { BusyBlock } from "@/lib/types";
import { WeekCalendar } from "@/components/schedule/WeekCalendar";
import { Button, cn, Input, SectionLabel } from "@/components/ui";
import { StepHeader } from "../StepHeader";
import type { StepProps } from "../defaults";

const WEEKDAYS_IDX = [0, 1, 2, 3, 4];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const PRESETS: Omit<BusyBlock, "id">[] = [
  { category: "work", label: "Work", days: WEEKDAYS_IDX, start: 9 * 60, end: 17 * 60 },
  { category: "school", label: "School", days: WEEKDAYS_IDX, start: 8 * 60, end: 15 * 60 },
  { category: "school", label: "College", days: WEEKDAYS_IDX, start: 10 * 60, end: 16 * 60 },
  { category: "commute", label: "Commute", days: WEEKDAYS_IDX, start: 8 * 60, end: 9 * 60 },
];

function TimeSelect({ value, onChange, min = 0, max = 24 * 60, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-10 w-full cursor-pointer rounded-xl border border-line bg-surface-2 px-3 text-sm text-ink outline-none hover:border-line-strong focus:border-accent/60"
    >
      {TIME_OPTIONS.filter((t) => t >= min && t <= max).map((t) => (
        <option key={t} value={t}>
          {t === 24 * 60 ? "Midnight" : fmtTime(t)}
        </option>
      ))}
    </select>
  );
}

function BlockEditor({
  block,
  onPatch,
  onDelete,
  onDone,
}: {
  block: BusyBlock;
  onPatch: (p: Partial<BusyBlock>) => void;
  onDelete: () => void;
  onDone: () => void;
}) {
  const cat = busyCategory(block.category);
  return (
    <div>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="size-3 rounded-full" style={{ background: cat.color }} />
        <span className="flex-1 truncate font-medium">{block.label || cat.label}</span>
        <span className="text-xs text-muted">{fmtDuration(block.end - block.start)}</span>
      </div>

      <SectionLabel>Type</SectionLabel>
      <div className="grid grid-cols-2 gap-1.5">
        {BUSY_CATEGORIES.map((c) => {
          const Icon = c.icon!;
          const on = c.id === block.category;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onPatch({ category: c.id })}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition",
                on ? "border-transparent text-ink" : "border-line text-muted hover:text-ink",
              )}
              style={on ? { background: `color-mix(in srgb, ${c.color} 25%, transparent)`, borderColor: c.color } : undefined}
            >
              <Icon className="size-3.5" style={{ color: c.color }} />
              <span className="truncate">{c.label}</span>
            </button>
          );
        })}
      </div>

      <SectionLabel className="mt-5">Label</SectionLabel>
      <Input className="h-10 text-sm" placeholder={cat.label} value={block.label} onChange={(e) => onPatch({ label: e.target.value })} />

      <SectionLabel className="mt-5">Time</SectionLabel>
      <div className="grid grid-cols-2 gap-2">
        <TimeSelect label="Start" value={block.start} max={block.end - 30} onChange={(start) => onPatch({ start })} />
        <TimeSelect label="End" value={block.end} min={block.start + 30} onChange={(end) => onPatch({ end })} />
      </div>

      <SectionLabel className="mt-5">Repeats on</SectionLabel>
      <div className="flex gap-1">
        {WEEKDAYS.map((d, i) => {
          const on = block.days.includes(i);
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                const days = on ? block.days.filter((x) => x !== i) : [...block.days, i].sort((a, b) => a - b);
                if (days.length) onPatch({ days });
              }}
              className={cn(
                "flex h-8 flex-1 items-center justify-center rounded-lg text-[11px] font-semibold transition",
                on ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {d[0]}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 text-xs">
        {[
          ["Weekdays", WEEKDAYS_IDX],
          ["Every day", EVERY_DAY],
        ].map(([label, days]) => (
          <button
            key={label as string}
            type="button"
            onClick={() => onPatch({ days: days as number[] })}
            className="rounded-lg px-2 py-1 text-muted hover:bg-surface-2 hover:text-ink"
          >
            {label as string}
          </button>
        ))}
      </div>

      <div className="mt-6 flex gap-2">
        <Button variant="danger" className="h-9 px-3" onClick={onDelete} aria-label="Delete block">
          <Trash2 className="size-4" />
        </Button>
        <Button variant="secondary" className="h-9 flex-1" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

export function ScheduleStep({ draft, update }: StepProps) {
  const s = draft.schedule;
  const set = (patch: Partial<typeof s>) => update("schedule", patch);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastCategory, setLastCategory] = useState("work");
  const selected = s.blocks.find((b) => b.id === selectedId) ?? null;
  const free = freeMinutesByDay(s);
  const totalFree = free.reduce((a, b) => a + b, 0);
  const mins = s.sessionMinutes;

  const patchBlock = (id: string, p: Partial<BusyBlock>) => {
    if (p.category) setLastCategory(p.category);
    set({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) });
  };

  const addPreset = (p: Omit<BusyBlock, "id">) => {
    const block = { ...p, id: crypto.randomUUID() };
    set({ blocks: [...s.blocks, block] });
    setSelectedId(block.id);
  };

  return (
    <>
      <StepHeader
        icon={CalendarClock}
        eyebrow="Training · Schedule"
        title="What does your week look like?"
        subtitle="Block out the times you're busy with school, college, work or anything else. Programs will be built into the gaps."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <SectionLabel>Sessions per week</SectionLabel>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => set({ daysPerWeek: n })}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center rounded-xl border font-display text-base font-semibold transition",
                  s.daysPerWeek === n ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface-2 text-muted hover:text-ink",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <SectionLabel>Session length</SectionLabel>
            <span className="font-display text-lg font-semibold tabular-nums">{fmtDuration(mins)}</span>
          </div>
          <input
            type="range"
            className="range"
            min={15}
            max={180}
            step={5}
            value={mins}
            style={{ ["--fill" as string]: `${((mins - 15) / 165) * 100}%` }}
            onChange={(e) => set({ sessionMinutes: Number(e.target.value) })}
            aria-label="Session length in minutes"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <WeekCalendar
          blocks={s.blocks}
          wakeMin={s.wakeMin}
          sleepMin={s.sleepMin}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onChange={(blocks) => set({ blocks })}
          newCategory={lastCategory}
        />

        <aside className="h-fit rounded-2xl border border-line bg-surface p-4">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <motion.div key="edit" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
                <BlockEditor
                  block={selected}
                  onPatch={(p) => patchBlock(selected.id, p)}
                  onDelete={() => {
                    set({ blocks: s.blocks.filter((b) => b.id !== selected.id) });
                    setSelectedId(null);
                  }}
                  onDone={() => setSelectedId(null)}
                />
              </motion.div>
            ) : (
              <motion.div key="overview" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
                <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">
                  <MousePointerClick className="mt-0.5 size-4 shrink-0 text-accent" />
                  <span>
                    <span className="text-ink">Drag</span> on the calendar to block out time, or tap a slot for an hour. Drag blocks to move them, pull
                    the bottom edge to resize.
                  </span>
                </div>

                <SectionLabel className="flex items-center gap-1.5">
                  <Zap className="size-3" /> Quick add
                </SectionLabel>
                <div className="space-y-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => addPreset(p)}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-left text-sm transition hover:border-line-strong hover:bg-surface-2"
                    >
                      <span className="size-2 rounded-full" style={{ background: busyCategory(p.category).color }} />
                      <span className="flex-1">{p.label}</span>
                      <span className="text-[11px] text-faint">
                        {daysLabel(p.days)} · {fmtRange(p)}
                      </span>
                    </button>
                  ))}
                </div>

                <SectionLabel className="mt-5">Sleep</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted">
                    <span className="mb-1 flex items-center gap-1">
                      <Sunrise className="size-3" /> Wake up
                    </span>
                    <TimeSelect label="Wake up" value={s.wakeMin} max={23 * 60 + 30} onChange={(wakeMin) => set({ wakeMin })} />
                  </label>
                  <label className="text-[11px] text-muted">
                    <span className="mb-1 flex items-center gap-1">
                      <Moon className="size-3" /> Bedtime
                    </span>
                    <TimeSelect label="Bedtime" value={s.sleepMin} max={23 * 60 + 30} onChange={(sleepMin) => set({ sleepMin })} />
                  </label>
                </div>

                <div className="mt-5 rounded-xl border border-line p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-faint">Free waking time</p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
                    {Math.round(totalFree / 60)}h <span className="text-sm font-normal text-muted">/ week</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {s.blocks.length} commitment{s.blocks.length === 1 ? "" : "s"} blocked out
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </>
  );
}
