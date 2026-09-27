"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Flame, Plus, Timer, Trash2, Zap } from "lucide-react";
import { CONTACT_GUIDE, PLYO_INTENSITY, type EditorKind } from "@/data/activities";
import { kgToLb, lbToKg, round1 } from "@/lib/body";
import { titleCase, type Exercise } from "@/lib/explorer";
import type { SetKind, Units, WorkoutEntry, WorkoutExercise, WorkoutSet } from "@/lib/types";
import { entryHardSets, entryValue, fmtRest, fmtSets, modifierById, newSet, SET_KINDS, SET_MODIFIERS, setValue } from "@/lib/workout";
import { ExerciseThumb } from "../../explorer/ExerciseBits";
import { ExerciseBadge } from "./ExercisePicker";
import { Modal } from "../../Modal";
import { Button, cn } from "../../ui";

const RESTS = [30, 60, 90, 120, 180, 240];

function toDisplay(kg: number | null, units: Units) {
  if (kg == null) return "";
  return String(units === "metric" ? round1(kg) : Math.round(kgToLb(kg) * 2) / 2);
}
function fromDisplay(v: string, units: Units) {
  if (v === "") return null;
  const n = Number(v);
  if (!isFinite(n)) return null;
  return units === "metric" ? n : lbToKg(n);
}

function Num({ value, onChange, placeholder, suffix, label, className }: { value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string; label: string; className?: string }) {
  return (
    <label className={cn("relative block", className)}>
      <span className="sr-only">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-line bg-surface-2 px-2.5 pr-8 text-sm tabular-nums outline-none transition placeholder:text-faint hover:border-line-strong focus:border-accent/60"
      />
      {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-faint">{suffix}</span>}
    </label>
  );
}

function TechniqueMenu({ set, onChange }: { set: WorkoutSet; onChange: (mods: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  const disabled = set.kind === "warmup";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 items-center gap-1 rounded-lg border px-2 text-xs transition disabled:opacity-30",
          set.modifiers.length ? "border-warn/50 bg-warn/10 text-warn" : "border-line text-muted hover:text-ink",
        )}
        title={disabled ? "Techniques apply to working and back-off sets" : "Intensity techniques"}
      >
        <Flame className="size-3.5" />
        {set.modifiers.length || ""}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30 w-60 rounded-xl border border-line-strong bg-surface p-1.5 shadow-2xl">
          <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Techniques · extra fatigue</p>
          {SET_MODIFIERS.map((m) => {
            const on = set.modifiers.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange(on ? set.modifiers.filter((x) => x !== m.id) : [...set.modifiers, m.id])}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
              >
                <span className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-warn bg-warn text-accent-ink" : "border-line-strong")}>
                  {on && <Check className="size-3" strokeWidth={3.5} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between text-xs font-medium">
                    {m.label}
                    <span className="tabular-nums text-warn">+{m.value}</span>
                  </span>
                  <span className="block text-[10px] leading-snug text-faint">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Mode = Exclude<EditorKind, "cardio" | "session">;

const COLUMNS: Record<Mode, { type: boolean; weight: string | null; rpe: boolean; tech: boolean; value: boolean; amount: string }> = {
  strength: { type: true, weight: "Weight", rpe: true, tech: true, value: true, amount: "Reps" },
  calisthenics: { type: true, weight: "Added load", rpe: true, tech: true, value: true, amount: "Reps" },
  plyo: { type: true, weight: null, rpe: false, tech: false, value: false, amount: "Contacts" },
  mobility: { type: false, weight: null, rpe: false, tech: false, value: false, amount: "Hold" },
};

function gridFor(mode: Mode) {
  const c = COLUMNS[mode];
  return ["34px", c.type && "112px", c.weight && "1fr", "1fr", c.rpe && "76px", c.tech && "auto", c.value && "44px", "auto"].filter(Boolean).join(" ");
}

function SetRow({
  set,
  label,
  units,
  mode,
  timed,
  onChange,
  onDuplicate,
  onDelete,
  prefix,
}: {
  set: WorkoutSet;
  label: string;
  units: Units;
  mode: Mode;
  timed: boolean;
  onChange: (p: Partial<WorkoutSet>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  prefix?: string;
}) {
  const col = COLUMNS[mode];
  const kind = SET_KINDS.find((k) => k.id === set.kind)!;
  const v = setValue(set);
  const kinds = mode === "plyo" ? SET_KINDS.filter((k) => k.id !== "backoff") : SET_KINDS;
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-2">
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: gridFor(mode) }}>
        <span
          className="flex size-8 items-center justify-center rounded-lg font-display text-xs font-bold"
          style={{ background: `color-mix(in srgb, ${kind.color} 20%, transparent)`, color: kind.color }}
          title={kind.label}
        >
          {prefix}
          {label}
        </span>
        {col.type && (
          <select
            aria-label="Set type"
            value={set.kind}
            onChange={(e) => onChange({ kind: e.target.value as SetKind, modifiers: e.target.value === "warmup" ? [] : set.modifiers })}
            className="h-9 min-w-0 cursor-pointer rounded-lg border border-line bg-surface-2 px-2 text-xs outline-none hover:border-line-strong focus:border-accent/60"
          >
            {kinds.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        )}
        {col.weight && (
          <Num
            label={col.weight}
            value={toDisplay(set.weight, units)}
            onChange={(x) => onChange({ weight: fromDisplay(x, units) })}
            placeholder={mode === "calisthenics" ? "BW" : "BW"}
            suffix={units === "metric" ? "kg" : "lb"}
          />
        )}
        {timed ? (
          <Num
            label="Hold time"
            value={set.holdSec == null ? "" : String(set.holdSec)}
            onChange={(x) => onChange({ holdSec: x === "" ? null : Math.max(0, Math.round(Number(x))) })}
            placeholder="–"
            suffix="sec"
          />
        ) : (
          <Num
            label={col.amount}
            value={set.reps == null ? "" : String(set.reps)}
            onChange={(x) => onChange({ reps: x === "" ? null : Math.max(0, Math.round(Number(x))) })}
            placeholder="–"
            suffix={mode === "plyo" ? "contacts" : "reps"}
          />
        )}
        {col.rpe && (
          <select
            aria-label="RPE"
            value={set.rpe ?? ""}
            onChange={(e) => onChange({ rpe: e.target.value ? Number(e.target.value) : null })}
            className={cn("h-9 cursor-pointer rounded-lg border border-line bg-surface-2 px-2 text-xs outline-none hover:border-line-strong focus:border-accent/60", set.rpe == null && "text-faint")}
            title="Rate of perceived exertion"
          >
            <option value="">RPE</option>
            {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => (
              <option key={r} value={r}>
                RPE {r}
              </option>
            ))}
          </select>
        )}
        {col.tech && <TechniqueMenu set={set} onChange={(modifiers) => onChange({ modifiers })} />}
        {col.value && (
          <span className={cn("text-center font-display text-xs font-semibold tabular-nums", v === 0 ? "text-faint" : v > 1 ? "text-warn" : "text-ink")} title="Counts as this many sets">
            {fmtSets(v)}
          </span>
        )}
        <div className="flex">
          <button type="button" onClick={onDuplicate} className="rounded-lg p-2 text-faint hover:bg-surface-3 hover:text-ink" aria-label="Duplicate set" title="Duplicate">
            <Copy className="size-3.5" />
          </button>
          <button type="button" onClick={onDelete} className="rounded-lg p-2 text-faint hover:bg-danger/10 hover:text-danger" aria-label="Delete set" title="Delete">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {set.modifiers.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 pl-[42px]">
          {set.modifiers.map((id) => (
            <span key={id} className="rounded-md bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn">
              {modifierById(id)?.label} +{modifierById(id)?.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function setLabels(sets: WorkoutSet[]) {
  let n = 0;
  return sets.map((s) => (s.kind === "warmup" ? "W" : s.kind === "backoff" ? "B" : String(++n)));
}

function QuickApply({
  units,
  mode,
  timed,
  onApply,
}: {
  units: Units;
  mode: Mode;
  timed: boolean;
  onApply: (weight: number | null | undefined, amount: number | undefined) => void;
}) {
  const [w, setW] = useState("");
  const [r, setR] = useState("");
  const col = COLUMNS[mode];
  const amountLabel = timed ? "Seconds" : col.amount;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line p-2.5">
      <Zap className="size-3.5 text-accent" />
      <span className="text-xs text-muted">All working sets:</span>
      {col.weight && <Num label={`${col.weight} for all`} value={w} onChange={setW} placeholder={col.weight} suffix={units === "metric" ? "kg" : "lb"} className="w-32" />}
      <Num label={`${amountLabel} for all`} value={r} onChange={setR} placeholder={amountLabel} className="w-28" />
      <Button
        variant="secondary"
        className="h-9 px-3 text-xs"
        disabled={!w && !r}
        onClick={() => {
          onApply(w ? fromDisplay(w, units) : undefined, r ? Math.round(Number(r)) : undefined);
          setW("");
          setR("");
        }}
      >
        Apply
      </Button>
    </div>
  );
}

export function SetEditor({
  entry,
  letter,
  mode,
  exercises,
  allExercises,
  units,
  onChange,
  onClose,
}: {
  entry: WorkoutEntry | null;
  letter: string;
  mode: Mode;
  exercises: Map<string, Exercise>;
  allExercises: Exercise[];
  units: Units;
  onChange: (entry: WorkoutEntry) => void;
  onClose: () => void;
}) {
  if (!entry) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  const col = COLUMNS[mode];
  const superset = entry.exercises.length > 1;
  const name = (we: WorkoutExercise) => exercises.get(we.exerciseId)?.name ?? "Unknown exercise";
  const isTimed = (we: WorkoutExercise) => mode === "mobility" || exercises.get(we.exerciseId)?.measure === "time";

  const patchExercise = (id: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
    onChange({ ...entry, exercises: entry.exercises.map((we) => (we.id === id ? fn(we) : we)) });
  const patchSet = (exId: string, setId: string, p: Partial<WorkoutSet>) =>
    patchExercise(exId, (we) => ({ ...we, sets: we.sets.map((s) => (s.id === setId ? { ...s, ...p } : s)) }));
  const duplicateSet = (exId: string, setId: string) =>
    patchExercise(exId, (we) => {
      const i = we.sets.findIndex((s) => s.id === setId);
      const sets = [...we.sets];
      sets.splice(i + 1, 0, newSet(we.sets[i].kind, we.sets[i]));
      return { ...we, sets };
    });
  const deleteSet = (exId: string, setId: string) => patchExercise(exId, (we) => ({ ...we, sets: we.sets.filter((s) => s.id !== setId) }));

  const addSet = (we: WorkoutExercise, kind: SetKind): WorkoutExercise => {
    const template = [...we.sets].reverse().find((s) => s.kind === kind) ?? [...we.sets].reverse().find((s) => s.kind === "working");
    const set = newSet(kind, template ? { weight: template.weight, reps: template.reps, holdSec: template.holdSec, rpe: kind === "warmup" ? null : template.rpe, kind } : undefined);
    if (kind === "warmup") {
      const firstWorking = we.sets.findIndex((s) => s.kind !== "warmup");
      const sets = [...we.sets];
      sets.splice(firstWorking === -1 ? sets.length : firstWorking, 0, set);
      return { ...we, sets };
    }
    return { ...we, sets: [...we.sets, set] };
  };

  const applyAll = (weight: number | null | undefined, amount: number | undefined) =>
    onChange({
      ...entry,
      exercises: entry.exercises.map((we) => ({
        ...we,
        sets: we.sets.map((s) =>
          s.kind === "working"
            ? {
                ...s,
                ...(weight !== undefined && { weight }),
                ...(amount !== undefined && (isTimed(we) ? { holdSec: amount } : { reps: amount })),
              }
            : s,
        ),
      })),
    });

  const neighbour = (we: WorkoutExercise, dir: -1 | 1) => {
    const ex = exercises.get(we.exerciseId);
    if (!ex?.family || !ex.step) return null;
    return allExercises.find((x) => x.family === ex.family && x.step === ex.step! + dir) ?? null;
  };
  const familySize = (fam: string) => allExercises.filter((x) => x.family === fam).length;

  const rounds = Math.max(...entry.exercises.map((we) => we.sets.length), 0);
  const hard = entryHardSets(entry);
  const bonus = entryValue(entry) - hard;
  const contacts = entry.exercises.reduce((a, we) => a + we.sets.filter((s) => s.kind !== "warmup").reduce((b, s) => b + (s.reps ?? 0), 0), 0);
  const kinds = mode === "plyo" ? SET_KINDS.filter((k) => k.id !== "backoff") : mode === "mobility" ? SET_KINDS.filter((k) => k.id === "working") : SET_KINDS;

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-muted">
        {mode === "plyo" ? (
          <>
            <span className="font-display text-lg font-semibold text-ink">{contacts}</span> ground contacts
            <span className="text-faint"> · {hard} sets</span>
          </>
        ) : mode === "mobility" ? (
          <>
            <span className="font-display text-lg font-semibold text-ink">{hard}</span> holds
          </>
        ) : (
          <>
            <span className="font-display text-lg font-semibold text-ink">{hard}</span> sets
            {bonus > 0 && <span className="ml-1.5 rounded-md bg-warn/10 px-1.5 py-0.5 text-xs text-warn">+{fmtSets(bonus)} from techniques</span>}
          </>
        )}
      </p>
      <Button onClick={onClose} className="px-6">
        Done
      </Button>
    </div>
  );

  const header = (
    <div className="mt-4 hidden gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint sm:grid" style={{ gridTemplateColumns: gridFor(mode) }}>
      <span>Set</span>
      {col.type && <span>Type</span>}
      {col.weight && <span>{col.weight}</span>}
      <span>{mode === "mobility" ? "Hold" : entry.exercises.some(isTimed) ? `${col.amount} / hold` : col.amount}</span>
      {col.rpe && <span>Effort</span>}
      {col.tech && (
        <span className="w-9 text-center" title="Intensity techniques">
          <Flame className="mx-auto size-3" />
        </span>
      )}
      {col.value && <span className="text-center">Counts</span>}
      <span />
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      className="max-w-4xl"
      title={superset ? "Superset" : name(entry.exercises[0])}
      subtitle={superset ? entry.exercises.map((we, i) => `${letter}${i + 1} ${name(we)}`).join("  ·  ") : titleCase(exercises.get(entry.exercises[0].exerciseId)?.equipment ?? "")}
      footer={footer}
    >
      <div className={cn("grid gap-3", superset && "sm:grid-cols-2")}>
        {entry.exercises.map((we, i) => {
          const ex = exercises.get(we.exerciseId);
          const easier = neighbour(we, -1);
          const harder = neighbour(we, 1);
          return (
            <div key={we.id} className="rounded-xl border border-line bg-surface-2/50 p-2.5">
              <div className="flex gap-3">
                {ex && <ExerciseThumb exercise={ex} className="size-14 shrink-0 rounded-lg" />}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {superset && (
                      <span className="font-display text-accent">
                        {letter}
                        {i + 1}
                      </span>
                    )}
                    <span className="truncate">{name(we)}</span>
                    {ex && <ExerciseBadge e={ex} />}
                  </p>
                  <input
                    value={we.notes}
                    onChange={(e) => patchExercise(we.id, (x) => ({ ...x, notes: e.target.value }))}
                    placeholder="Notes: tempo, grip, cues…"
                    className="mt-1.5 h-8 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-xs outline-none placeholder:text-faint hover:border-line-strong focus:border-accent/60"
                  />
                </div>
              </div>
              {ex?.family && ex.step && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-violet/10 px-2 py-1.5 text-xs">
                  <button
                    type="button"
                    disabled={!easier}
                    onClick={() => easier && patchExercise(we.id, (x) => ({ ...x, exerciseId: easier.id }))}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-violet hover:bg-violet/15 disabled:opacity-30"
                    title={easier?.name}
                  >
                    <ChevronLeft className="size-3.5" /> Easier
                  </button>
                  <span className="text-muted">
                    {ex.family} progression · step {ex.step} of {familySize(ex.family)}
                  </span>
                  <button
                    type="button"
                    disabled={!harder}
                    onClick={() => harder && patchExercise(we.id, (x) => ({ ...x, exerciseId: harder.id }))}
                    className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-violet hover:bg-violet/15 disabled:opacity-30"
                    title={harder?.name}
                  >
                    Harder <ChevronRight className="size-3.5" />
                  </button>
                </div>
              )}
              {ex?.discipline === "plyometrics" && ex.intensity && (
                <p className="mt-2 text-[11px] text-muted">
                  <span style={{ color: PLYO_INTENSITY[ex.intensity].color }}>{PLYO_INTENSITY[ex.intensity].label} intensity</span> · each contact is a
                  maximal effort; rest fully between sets.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Timer className="size-4 text-muted" />
        <span className="text-xs text-muted">Rest {superset ? "after each round" : "between sets"}</span>
        {(mode === "mobility" ? [15, 30, 45, 60] : RESTS).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange({ ...entry, restSec: entry.restSec === r ? null : r })}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs tabular-nums transition",
              entry.restSec === r ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-muted hover:text-ink",
            )}
          >
            {fmtRest(r)}
          </button>
        ))}
      </div>

      {mode === "plyo" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[11px] text-muted">
          <span className="font-medium text-ink">Contacts per session:</span>
          {CONTACT_GUIDE.map((g) => (
            <span key={g.level}>
              {g.level} {g.range[0]}–{g.range[1]}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4">
        <QuickApply units={units} mode={mode} timed={entry.exercises.every(isTimed)} onApply={applyAll} />
      </div>

      {header}

      {superset ? (
        <div className="mt-2 space-y-3">
          {Array.from({ length: rounds }, (_, r) => (
            <div key={r} className="rounded-2xl border border-line p-2">
              <div className="mb-1.5 flex items-center justify-between px-1">
                <span className="text-xs font-semibold">Round {r + 1}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...entry, exercises: entry.exercises.map((we) => ({ ...we, sets: we.sets.filter((_, i) => i !== r) })) })}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-faint hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-3" /> Round
                </button>
              </div>
              <div className="space-y-1.5">
                {entry.exercises.map((we, i) => {
                  const s = we.sets[r];
                  if (!s) return null;
                  return (
                    <SetRow
                      key={s.id}
                      set={s}
                      prefix={`${letter}${i + 1}`}
                      label=""
                      units={units}
                      mode={mode}
                      timed={isTimed(we)}
                      onChange={(p) => patchSet(we.id, s.id, p)}
                      onDuplicate={() => duplicateSet(we.id, s.id)}
                      onDelete={() => deleteSet(we.id, s.id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className="h-9 text-xs" onClick={() => onChange({ ...entry, exercises: entry.exercises.map((we) => addSet(we, "working")) })}>
              <Plus className="size-3.5" /> Add round
            </Button>
            {mode !== "mobility" && (
              <Button variant="ghost" className="h-9 text-xs" onClick={() => onChange({ ...entry, exercises: entry.exercises.map((we) => addSet(we, "warmup")) })}>
                <Plus className="size-3.5" /> Warm-up round
              </Button>
            )}
          </div>
        </div>
      ) : (
        (() => {
          const we = entry.exercises[0];
          const labels = setLabels(we.sets);
          return (
            <div className="mt-2 space-y-1.5">
              {we.sets.map((s, i) => (
                <SetRow
                  key={s.id}
                  set={s}
                  label={labels[i]}
                  units={units}
                  mode={mode}
                  timed={isTimed(we)}
                  onChange={(p) => patchSet(we.id, s.id, p)}
                  onDuplicate={() => duplicateSet(we.id, s.id)}
                  onDelete={() => deleteSet(we.id, s.id)}
                />
              ))}
              {we.sets.length === 0 && <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-faint">No sets yet. Add one below.</p>}
              <div className="flex flex-wrap gap-2 pt-1.5">
                {kinds.map((k) => (
                  <Button key={k.id} variant={k.id === "working" ? "secondary" : "ghost"} className="h-9 text-xs" onClick={() => patchExercise(we.id, (x) => addSet(x, k.id))}>
                    <Plus className="size-3.5" /> {mode === "mobility" ? "Hold" : k.label}
                  </Button>
                ))}
              </div>
            </div>
          );
        })()
      )}
    </Modal>
  );
}
