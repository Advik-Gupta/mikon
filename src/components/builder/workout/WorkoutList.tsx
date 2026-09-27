"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { Copy, Dumbbell, GripVertical, Link2, MoreHorizontal, Pencil, Timer, Trash2, Unlink, X } from "lucide-react";
import { MUSCLE_GROUPS } from "@/data/muscles";
import { formatWeight } from "@/lib/body";
import { groupsForKeys, type Exercise } from "@/lib/explorer";
import type { Units, WorkoutEntry } from "@/lib/types";
import { entryHardSets, entryValue, fmtRest, setSummary, SUPERSET_LETTERS } from "@/lib/workout";
import { ExerciseBadge } from "./ExercisePicker";
import { ExerciseThumb } from "../../explorer/ExerciseBits";
import { cn } from "../../ui";

export const MERGE = "merge:";
export const WORKOUT = "workout";

function Menu({ items }: { items: { label: string; icon: typeof Copy; onClick: () => void; danger?: boolean; hidden?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} className="relative" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-lg p-1.5 text-faint hover:bg-surface-3 hover:text-ink" aria-label="More actions">
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-line-strong bg-surface p-1 shadow-2xl">
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <button
                key={i.label}
                type="button"
                onClick={() => {
                  i.onClick();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs",
                  i.danger ? "text-danger hover:bg-danger/10" : "text-ink/90 hover:bg-surface-2",
                )}
              >
                <i.icon className="size-3.5" />
                {i.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function EntryCard({
  entry,
  unitLabel,
  index,
  isLast,
  exercises,
  units,
  dragging,
  mergeTarget,
  onEdit,
  onDelete,
  onDuplicate,
  onSupersetNext,
  onSplit,
  onRemoveFromSuperset,
}: {
  entry: WorkoutEntry;
  unitLabel: string;
  index: number;
  isLast: boolean;
  exercises: Map<string, Exercise>;
  units: Units;
  dragging: boolean;
  mergeTarget: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSupersetNext: () => void;
  onSplit: () => void;
  onRemoveFromSuperset: (exerciseRowId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const { setNodeRef: setMergeRef } = useDroppable({ id: MERGE + entry.id });
  const superset = entry.exercises.length > 1;
  const letter = SUPERSET_LETTERS[index] ?? String(index + 1);
  const hard = entryHardSets(entry);
  const bonus = entryValue(entry) - hard;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative cursor-grab touch-none select-none active:cursor-grabbing", isDragging && "z-10 opacity-40")}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border bg-surface transition-colors",
          superset ? "border-violet/40" : "border-line hover:border-line-strong",
          mergeTarget && "border-accent ring-4 ring-accent/15",
        )}
      >
        {superset && <span className="absolute inset-y-0 left-0 w-1 bg-violet" />}
        <header className="flex items-center gap-2 px-3 pt-2.5">
          <span className="rounded-md p-1 text-faint" aria-label="Drag to reorder">
            <GripVertical className="size-4" />
          </span>
          <span className={cn("rounded-md px-1.5 py-0.5 font-display text-xs font-bold", superset ? "bg-violet/15 text-violet" : "bg-surface-3 text-ink")}>
            {letter}
          </span>
          {superset && <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-violet">Superset · {entry.exercises.length} exercises</span>}
          <span className="ml-auto flex items-center gap-1">
            {entry.restSec != null && (
              <span className="hidden items-center gap-1 text-[11px] text-faint sm:flex">
                <Timer className="size-3" />
                {fmtRest(entry.restSec)}
              </span>
            )}
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-display text-[11px] font-semibold tabular-nums">
              {hard} {unitLabel}
            </span>
            {bonus > 0 && (
              <span className="rounded-md bg-warn/10 px-1.5 py-0.5 text-[10px] font-medium text-warn" title="Intensity techniques add fatigue on top">
                +techniques
              </span>
            )}
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onEdit}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-accent hover:text-accent-ink"
            >
              <Pencil className="size-3.5" /> Sets
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              className="rounded-lg p-1.5 text-faint transition hover:bg-danger/10 hover:text-danger"
              aria-label={superset ? "Remove superset" : "Remove exercise"}
              title={superset ? "Remove superset" : "Remove exercise"}
            >
              <Trash2 className="size-4" />
            </button>
            <Menu
              items={[
                { label: "Edit sets", icon: Pencil, onClick: onEdit },
                { label: "Superset with next", icon: Link2, onClick: onSupersetNext, hidden: isLast },
                { label: "Split superset", icon: Unlink, onClick: onSplit, hidden: !superset },
                { label: "Duplicate", icon: Copy, onClick: onDuplicate },
                { label: "Remove", icon: Trash2, onClick: onDelete, danger: true },
              ]}
            />
          </span>
        </header>

        <button type="button" onClick={onEdit} className="block w-full px-3 pb-3 pt-2 text-left">
          <div className="space-y-2">
            {entry.exercises.map((we, i) => {
              const ex = exercises.get(we.exerciseId);
              const groups = ex ? groupsForKeys(ex.primary).map((g) => MUSCLE_GROUPS.find((x) => x.id === g)?.name) : [];
              return (
                <div key={we.id} className="flex items-center gap-3">
                  {ex ? (
                    <ExerciseThumb exercise={ex} className="size-12 shrink-0 rounded-lg" />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-faint">
                      <Dumbbell className="size-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      {superset && <span className="font-display text-xs text-violet">{letter}{i + 1}</span>}
                      <span className="truncate">{ex?.name ?? "Unknown exercise"}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{setSummary(we.sets, (kg) => formatWeight(kg, units), ex?.discipline === "plyometrics" ? " contacts" : "")}</span>
                    <span className="flex items-center gap-1.5 truncate text-[11px] text-faint">
                      {ex && <ExerciseBadge e={ex} />}
                      <span className="truncate">{groups.join(", ")}</span>
                    </span>
                  </span>
                  {superset && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromSuperset(we.id);
                      }}
                      className="rounded-md p-1 text-faint opacity-0 transition hover:bg-surface-3 hover:text-ink group-hover:opacity-100"
                      title="Take out of superset"
                    >
                      <X className="size-3.5" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </button>

        {/* Superset drop zone: the middle of the card, only while dragging something else */}
        <div
          ref={setMergeRef}
          className={cn(
            "pointer-events-none absolute inset-x-6 top-1/4 bottom-1/4 flex items-center justify-center rounded-xl border-2 border-dashed transition",
            dragging && mergeTarget ? "border-accent bg-accent/15 opacity-100" : "border-transparent opacity-0",
          )}
        >
          <span className="flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink">
            <Link2 className="size-3.5" /> Drop to superset
          </span>
        </div>
      </div>
    </div>
  );
}

export function WorkoutList({
  entries,
  unitLabel = "sets",
  exercises,
  units,
  activeId,
  mergeTargetId,
  onEdit,
  onChange,
}: {
  entries: WorkoutEntry[];
  /** "sets" or "holds" etc. */
  unitLabel?: string;
  exercises: Map<string, Exercise>;
  units: Units;
  activeId: string | null;
  mergeTargetId: string | null;
  onEdit: (entryId: string) => void;
  onChange: (entries: WorkoutEntry[]) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: WORKOUT });
  const clone = (e: WorkoutEntry): WorkoutEntry => ({
    ...e,
    id: crypto.randomUUID(),
    exercises: e.exercises.map((x) => ({ ...x, id: crypto.randomUUID(), sets: x.sets.map((s) => ({ ...s, id: crypto.randomUUID() })) })),
  });

  return (
    <div ref={setNodeRef} className={cn("flex-1 rounded-2xl pb-16 transition", isOver && activeId && !entries.length && "bg-accent/[0.04]")}>
      <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {entries.map((entry, i) => (
              <motion.div key={entry.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                <EntryCard
                  entry={entry}
                  unitLabel={unitLabel}
                  index={i}
                  isLast={i === entries.length - 1}
                  exercises={exercises}
                  units={units}
                  dragging={!!activeId && activeId !== entry.id}
                  mergeTarget={mergeTargetId === entry.id}
                  onEdit={() => onEdit(entry.id)}
                  onDelete={() => onChange(entries.filter((e) => e.id !== entry.id))}
                  onDuplicate={() => onChange([...entries.slice(0, i + 1), clone(entry), ...entries.slice(i + 1)])}
                  onSupersetNext={() => {
                    const next = entries[i + 1];
                    const merged = { ...entry, exercises: [...entry.exercises, ...next.exercises] };
                    onChange(entries.flatMap((e) => (e.id === entry.id ? [merged] : e.id === next.id ? [] : [e])));
                  }}
                  onSplit={() =>
                    onChange(
                      entries.flatMap((e) =>
                        e.id === entry.id ? e.exercises.map((x, k) => ({ id: k === 0 ? e.id : crypto.randomUUID(), exercises: [x], restSec: e.restSec })) : [e],
                      ),
                    )
                  }
                  onRemoveFromSuperset={(rowId) => {
                    const row = entry.exercises.find((x) => x.id === rowId)!;
                    const rest = { ...entry, exercises: entry.exercises.filter((x) => x.id !== rowId) };
                    const single = { id: crypto.randomUUID(), exercises: [row], restSec: entry.restSec };
                    onChange(entries.flatMap((e) => (e.id === entry.id ? [rest, single] : [e])));
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>

      {entries.length === 0 && (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition",
            isOver && activeId ? "border-accent/70 bg-accent/[0.05] text-accent" : "border-line text-faint",
          )}
        >
          <Dumbbell className="size-7" />
          <p className="mt-3 text-sm font-medium text-ink/80">No exercises yet</p>
          <p className="mt-1 max-w-xs text-xs">Drag exercises here from the library on the right, or tap + on any of them.</p>
        </div>
      )}
    </div>
  );
}
