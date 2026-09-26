"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Flame, Plus, Timer, Trash2, Zap } from "lucide-react";
import { kgToLb, lbToKg, round1 } from "@/lib/body";
import { titleCase, type Exercise } from "@/lib/explorer";
import type { SetKind, Units, WorkoutEntry, WorkoutExercise, WorkoutSet } from "@/lib/types";
import {
  entryValue,
  exerciseValue,
  fmtRest,
  fmtSets,
  modifierById,
  newSet,
  SET_KINDS,
  SET_MODIFIERS,
  setValue,
} from "@/lib/workout";
import { ExerciseThumb } from "../../explorer/ExerciseBits";
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

function SetRow({
  set,
  label,
  units,
  onChange,
  onDuplicate,
  onDelete,
  prefix,
}: {
  set: WorkoutSet;
  label: string;
  units: Units;
  onChange: (p: Partial<WorkoutSet>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  prefix?: string;
}) {
  const kind = SET_KINDS.find((k) => k.id === set.kind)!;
  const v = setValue(set);
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-2">
      <div className="grid grid-cols-[34px_1fr] items-center gap-2 sm:grid-cols-[34px_112px_1fr_1fr_76px_auto_44px_auto]">
        <span
          className="flex size-8 items-center justify-center rounded-lg font-display text-xs font-bold"
          style={{ background: `color-mix(in srgb, ${kind.color} 20%, transparent)`, color: kind.color }}
          title={kind.label}
        >
          {prefix}
          {label}
        </span>
        <select
          aria-label="Set type"
          value={set.kind}
          onChange={(e) => onChange({ kind: e.target.value as SetKind, modifiers: e.target.value === "warmup" ? [] : set.modifiers })}
          className="h-9 cursor-pointer rounded-lg border border-line bg-surface-2 px-2 text-xs outline-none hover:border-line-strong focus:border-accent/60"
        >
          {SET_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <Num label="Weight" value={toDisplay(set.weight, units)} onChange={(x) => onChange({ weight: fromDisplay(x, units) })} placeholder="BW" suffix={units === "metric" ? "kg" : "lb"} className="col-start-2 sm:col-start-auto" />
        <Num label="Reps" value={set.reps == null ? "" : String(set.reps)} onChange={(x) => onChange({ reps: x === "" ? null : Math.max(0, Math.round(Number(x))) })} placeholder="–" suffix="reps" className="col-start-2 sm:col-start-auto" />
        <select
          aria-label="RPE"
          value={set.rpe ?? ""}
          onChange={(e) => onChange({ rpe: e.target.value ? Number(e.target.value) : null })}
          className={cn(
            "col-start-2 h-9 cursor-pointer rounded-lg border border-line bg-surface-2 px-2 text-xs outline-none hover:border-line-strong focus:border-accent/60 sm:col-start-auto",
            set.rpe == null && "text-faint",
          )}
          title="Rate of perceived exertion"
        >
          <option value="">RPE</option>
          {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => (
            <option key={r} value={r}>
              RPE {r}
            </option>
          ))}
        </select>
        <div className="col-start-2 flex items-center gap-1 sm:col-start-auto">
          <TechniqueMenu set={set} onChange={(modifiers) => onChange({ modifiers })} />
        </div>
        <span
          className={cn("col-start-2 text-center font-display text-xs font-semibold tabular-nums sm:col-start-auto", v === 0 ? "text-faint" : v > 1 ? "text-warn" : "text-ink")}
          title="Effective sets this counts as"
        >
          {fmtSets(v)}
        </span>
        <div className="col-start-2 flex sm:col-start-auto">
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

/** Label sets W, 1, 2, 3…, B so working sets keep their own numbering. */
function setLabels(sets: WorkoutSet[]) {
  let n = 0;
  return sets.map((s) => (s.kind === "warmup" ? "W" : s.kind === "backoff" ? "B" : String(++n)));
}

function QuickApply({ units, onApply }: { units: Units; onApply: (weight: number | null | undefined, reps: number | null | undefined) => void }) {
  const [w, setW] = useState("");
  const [r, setR] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-line p-2.5">
      <Zap className="size-3.5 text-accent" />
      <span className="text-xs text-muted">All working sets:</span>
      <Num label="Weight for all" value={w} onChange={setW} placeholder="Weight" suffix={units === "metric" ? "kg" : "lb"} className="w-28" />
      <Num label="Reps for all" value={r} onChange={setR} placeholder="Reps" className="w-20" />
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
  exercises,
  units,
  onChange,
  onClose,
}: {
  entry: WorkoutEntry | null;
  /** The entry's position letter in the workout (A, B, C…) */
  letter: string;
  exercises: Map<string, Exercise>;
  units: Units;
  onChange: (entry: WorkoutEntry) => void;
  onClose: () => void;
}) {
  if (!entry) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  const superset = entry.exercises.length > 1;
  const name = (we: WorkoutExercise) => exercises.get(we.exerciseId)?.name ?? "Unknown exercise";

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

  /** New sets copy the most relevant existing set so you rarely retype numbers. */
  const addSet = (we: WorkoutExercise, kind: SetKind): WorkoutExercise => {
    const template = [...we.sets].reverse().find((s) => s.kind === kind) ?? [...we.sets].reverse().find((s) => s.kind === "working");
    const set = newSet(kind, template ? { weight: template.weight, reps: template.reps, rpe: kind === "warmup" ? null : template.rpe, kind } : undefined);
    if (kind === "warmup") {
      const firstWorking = we.sets.findIndex((s) => s.kind !== "warmup");
      const sets = [...we.sets];
      sets.splice(firstWorking === -1 ? sets.length : firstWorking, 0, set);
      return { ...we, sets };
    }
    return { ...we, sets: [...we.sets, set] };
  };

  const applyAll = (weight: number | null | undefined, reps: number | null | undefined) =>
    onChange({
      ...entry,
      exercises: entry.exercises.map((we) => ({
        ...we,
        sets: we.sets.map((s) => (s.kind === "working" ? { ...s, ...(weight !== undefined && { weight }), ...(reps !== undefined && { reps }) } : s)),
      })),
    });

  const rounds = Math.max(...entry.exercises.map((we) => we.sets.length), 0);
  const total = entryValue(entry);

  return (
    <Modal
      open
      onClose={onClose}
      className="max-w-4xl"
      title={superset ? "Superset" : name(entry.exercises[0])}
      subtitle={superset ? entry.exercises.map((we, i) => `${letter}${i + 1} ${name(we)}`).join("  ·  ") : titleCase(exercises.get(entry.exercises[0].exerciseId)?.equipment ?? "")}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            <span className="font-display text-lg font-semibold text-ink">{fmtSets(total)}</span> effective sets
            {superset && (
              <span className="text-faint">
                {" "}
                ({entry.exercises.map((we) => fmtSets(exerciseValue(we))).join(" + ")})
              </span>
            )}
          </p>
          <Button onClick={onClose} className="px-6">
            Done
          </Button>
        </div>
      }
    >
      {/* Exercises + notes */}
      <div className={cn("grid gap-3", superset && "sm:grid-cols-2")}>
        {entry.exercises.map((we, i) => {
          const ex = exercises.get(we.exerciseId);
          return (
            <div key={we.id} className="flex gap-3 rounded-xl border border-line bg-surface-2/50 p-2.5">
              {ex && <ExerciseThumb exercise={ex} className="size-14 shrink-0 rounded-lg" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {superset && (
                    <span className="mr-1.5 font-display text-accent">
                      {letter}
                      {i + 1}
                    </span>
                  )}
                  {name(we)}
                </p>
                <input
                  value={we.notes}
                  onChange={(e) => patchExercise(we.id, (x) => ({ ...x, notes: e.target.value }))}
                  placeholder="Notes: tempo, grip, cues…"
                  className="mt-1.5 h-8 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-xs outline-none placeholder:text-faint hover:border-line-strong focus:border-accent/60"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Timer className="size-4 text-muted" />
        <span className="text-xs text-muted">Rest {superset ? "after each round" : "between sets"}</span>
        {RESTS.map((r) => (
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

      <div className="mt-4">
        <QuickApply units={units} onApply={applyAll} />
      </div>

      {/* Sets */}
      <div className="mt-4 hidden grid-cols-[34px_112px_1fr_1fr_76px_auto_44px_auto] gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint sm:grid">
        <span>Set</span>
        <span>Type</span>
        <span>Weight</span>
        <span>Reps</span>
        <span>Effort</span>
        <span className="w-9 text-center" title="Intensity techniques">
          <Flame className="mx-auto size-3" />
        </span>
        <span className="text-center" title="Effective sets">
          Value
        </span>
        <span />
      </div>

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
            <Button variant="ghost" className="h-9 text-xs" onClick={() => onChange({ ...entry, exercises: entry.exercises.map((we) => addSet(we, "warmup")) })}>
              <Plus className="size-3.5" /> Warm-up round
            </Button>
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
                  onChange={(p) => patchSet(we.id, s.id, p)}
                  onDuplicate={() => duplicateSet(we.id, s.id)}
                  onDelete={() => deleteSet(we.id, s.id)}
                />
              ))}
              {we.sets.length === 0 && <p className="rounded-xl border border-dashed border-line py-6 text-center text-sm text-faint">No sets yet. Add one below.</p>}
              <div className="flex flex-wrap gap-2 pt-1.5">
                {SET_KINDS.map((k) => (
                  <Button key={k.id} variant={k.id === "working" ? "secondary" : "ghost"} className="h-9 text-xs" onClick={() => patchExercise(we.id, (x) => addSet(x, k.id))}>
                    <Plus className="size-3.5" /> {k.label}
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
