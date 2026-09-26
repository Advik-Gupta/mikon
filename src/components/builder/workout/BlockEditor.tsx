"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeft, Dumbbell, Flame, Link2, ListOrdered, PersonStanding } from "lucide-react";
import { blockType } from "@/lib/options";
import { dayLabel, updateProgram } from "@/lib/programs";
import { useExerciseDB, type Exercise, type Sex } from "@/lib/explorer";
import { useProfile } from "@/lib/storage";
import type { Program, WorkoutEntry } from "@/lib/types";
import { entryValue, fmtSets, newEntry, newExercise, programVolume, SUPERSET_LETTERS } from "@/lib/workout";
import { ExerciseThumb } from "../../explorer/ExerciseBits";
import { Modal } from "../../Modal";
import { Button, cn } from "../../ui";
import { ExercisePicker, LIB } from "./ExercisePicker";
import { HeatFigure } from "./HeatFigure";
import { SetEditor } from "./SetEditor";
import { MERGE, WORKOUT, WorkoutList } from "./WorkoutList";

interface PendingMerge {
  targetId: string;
  /** Existing entry being dropped, or a library exercise */
  sourceEntryId?: string;
  exerciseId?: string;
}

export function BlockEditor({ program, dayId, blockId }: { program: Program; dayId: string; blockId: string }) {
  const profile = useProfile();
  const { db } = useExerciseDB();
  const units = profile?.body.units ?? "metric";
  const sex: Sex = profile?.personal.sex === "female" ? "female" : "male";

  const dayIndex = program.days.findIndex((d) => d.id === dayId);
  const day = program.days[dayIndex];
  const block = day.blocks.find((b) => b.id === blockId)!;
  const bt = blockType(block.type);
  const entries = block.entries ?? [];

  const exercises = useMemo(() => new Map((db?.exercises ?? []).map((e) => [e.id, e])), [db]);
  const dayTypes = [...new Set(day.blocks.map((b) => b.type))].filter((t) => t !== "recovery");
  const [heatView, setHeatView] = useState<string>(block.type);
  const view = heatView === "all" || dayTypes.includes(heatView) ? heatView : block.type;
  const volume = programVolume(program, exercises, view === "all" ? null : view);
  const scopeLabel = program.structure.cycle === "weekly" && program.days.length === 7 ? "this week" : `per ${program.days.length}-day cycle`;

  const [editing, setEditing] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMerge | null>(null);

  const setEntries = (fn: (e: WorkoutEntry[]) => WorkoutEntry[]) =>
    updateProgram(program.id, (p) => ({
      ...p,
      days: p.days.map((d) =>
        d.id !== dayId ? d : { ...d, blocks: d.blocks.map((b) => (b.id !== blockId ? b : { ...b, entries: fn(b.entries ?? []) })) },
      ),
    }));

  const addExercise = (exerciseId: string, index?: number) =>
    setEntries((es) => {
      const next = [...es];
      next.splice(index ?? next.length, 0, newEntry(exerciseId));
      return next;
    });

  /* ---------------------------------------------------------------- dnd */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Only drop inside the workout column. The middle of a card means "superset", elsewhere means "place here". */
  const collision: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    if (!hits.some((h) => h.id === WORKOUT)) return [];
    const merge = hits.find((h) => String(h.id).startsWith(MERGE) && h.id !== MERGE + args.active.id);
    if (merge) return [merge];
    const last = entries.length ? args.droppableRects.get(entries[entries.length - 1].id) : undefined;
    if (!last || (args.pointerCoordinates && args.pointerCoordinates.y > last.bottom)) return [{ id: WORKOUT }];
    const sortables = args.droppableContainers.filter((c) => entries.some((e) => e.id === c.id));
    const nearest = sortables.length ? closestCenter({ ...args, droppableContainers: sortables }) : [];
    return nearest.length ? [nearest[0]] : [{ id: WORKOUT }];
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));
  const onDragOver = ({ over }: DragOverEvent) => {
    const id = over ? String(over.id) : "";
    setMergeTarget(id.startsWith(MERGE) ? id.slice(MERGE.length) : null);
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setMergeTarget(null);
    if (!over) return;
    const a = String(active.id);
    const o = String(over.id);
    const fromLib = a.startsWith(LIB) ? a.slice(LIB.length) : null;

    if (o.startsWith(MERGE)) {
      setPending({ targetId: o.slice(MERGE.length), ...(fromLib ? { exerciseId: fromLib } : { sourceEntryId: a }) });
      return;
    }
    const overIndex = entries.findIndex((e) => e.id === o);
    if (fromLib) {
      addExercise(fromLib, overIndex === -1 ? undefined : overIndex);
      return;
    }
    const from = entries.findIndex((e) => e.id === a);
    // Dropped on the empty space below the list: move to the end.
    const to = overIndex === -1 ? entries.length - 1 : overIndex;
    if (from !== -1 && from !== to) setEntries((es) => arrayMove(es, from, to));
  };

  const confirmMerge = () => {
    if (!pending) return;
    setEntries((es) => {
      const target = es.find((e) => e.id === pending.targetId);
      if (!target) return es;
      const source = pending.sourceEntryId ? es.find((e) => e.id === pending.sourceEntryId) : null;
      const added = source ? source.exercises : [newExercise(pending.exerciseId!)];
      return es
        .filter((e) => e.id !== source?.id)
        .map((e) => (e.id === target.id ? { ...e, exercises: [...e.exercises, ...added] } : e));
    });
    setPending(null);
  };

  const activeExercise: Exercise | undefined = activeId?.startsWith(LIB)
    ? exercises.get(activeId.slice(LIB.length))
    : exercises.get(entries.find((e) => e.id === activeId)?.exercises[0]?.exerciseId ?? "");
  const pendingNames = (() => {
    if (!pending) return null;
    const target = entries.find((e) => e.id === pending.targetId);
    const src = pending.sourceEntryId ? entries.find((e) => e.id === pending.sourceEntryId) : null;
    const names = (e?: WorkoutEntry | null) => e?.exercises.map((x) => exercises.get(x.exerciseId)?.name).join(" + ");
    return { target: names(target), source: src ? names(src) : exercises.get(pending.exerciseId ?? "")?.name };
  })();

  const totalSets = entries.reduce((a, e) => a + entryValue(e), 0);
  const exerciseCount = entries.reduce((a, e) => a + e.exercises.length, 0);
  const editingEntry = entries.find((e) => e.id === editing) ?? null;
  const Icon = bt.icon!;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setMergeTarget(null);
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
          <Link
            href={`/programs/${program.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium hover:border-line-strong"
          >
            <ArrowLeft className="size-3.5" /> Board
          </Link>
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${bt.color} 18%, transparent)`, color: bt.color }}
            >
              <Icon className="size-4" />
            </span>
            <div>
              <p className="font-display text-base font-semibold leading-tight">
                {dayLabel(program, dayIndex)} · {bt.label}
              </p>
              <p className="text-[11px] text-muted">{day.title || "Untitled day"}</p>
            </div>
          </div>
          {day.blocks.filter((b) => b.type !== "recovery").length > 1 && (
            <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
              {day.blocks
                .filter((b) => b.type !== "recovery")
                .map((b) => (
                  <Link
                    key={b.id}
                    href={`/programs/${program.id}?block=${b.id}`}
                    replace
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                      b.id === blockId ? "bg-ink text-bg" : "text-muted hover:text-ink",
                    )}
                  >
                    {blockType(b.type).label}
                  </Link>
                ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <ListOrdered className="size-3.5" />
              <span className="text-ink">{exerciseCount}</span> exercises
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="size-3.5" />
              <span className="font-display text-sm font-semibold text-ink">{fmtSets(totalSets)}</span> effective sets
            </span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(280px,340px)]">
          {/* Left: heatmap */}
          <aside className="hidden min-h-0 flex-col border-r border-line p-4 lg:flex">
            <div className="mb-3 flex items-center gap-2">
              <PersonStanding className="size-4 text-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Muscle load</h3>
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {[...dayTypes, "all"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setHeatView(t)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                    view === t ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
                  )}
                >
                  {t === "all" ? "Combined" : blockType(t).label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              <HeatFigure
                sex={sex}
                volume={volume}
                scopeLabel={scopeLabel}
                currentDayId={dayId}
                dayLabel={(id) => dayLabel(program, program.days.findIndex((d) => d.id === id))}
              />
            </div>
          </aside>

          {/* Center: workout */}
          <section className="board-grid scrollbar-thin min-h-0 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto flex min-h-full max-w-2xl flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Workout</h3>
                {entries.length > 1 && (
                  <span className="flex items-center gap-1 text-[11px] text-faint">
                    <Link2 className="size-3" /> Drop one exercise onto another to superset
                  </span>
                )}
              </div>
              {db ? (
                <WorkoutList
                  entries={entries}
                  exercises={exercises}
                  units={units}
                  activeId={activeId}
                  mergeTargetId={mergeTarget}
                  onEdit={setEditing}
                  onChange={(next) => setEntries(() => next)}
                />
              ) : (
                <div className="space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Right: exercise library */}
          <aside className="flex min-h-[420px] flex-col border-t border-line lg:min-h-0 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <Dumbbell className="size-4 text-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Exercise library</h3>
            </div>
            <div className="min-h-0 flex-1">
              {db ? (
                <ExercisePicker all={db.exercises} type={block.type} onAdd={(id) => addExercise(id)} />
              ) : (
                <p className="p-4 text-sm text-muted">Loading exercises…</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 160 }}>
        {activeExercise ? (
          <div className="flex w-72 rotate-1 items-center gap-3 rounded-xl border border-line-strong bg-surface-2 p-2 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)]">
            <ExerciseThumb exercise={activeExercise} className="size-11 shrink-0 rounded-lg" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{activeExercise.name}</span>
          </div>
        ) : null}
      </DragOverlay>

      <SetEditor
        entry={editingEntry}
        letter={SUPERSET_LETTERS[entries.findIndex((e) => e.id === editing)] ?? ""}
        exercises={exercises}
        units={units}
        onClose={() => setEditing(null)}
        onChange={(next) => setEntries((es) => es.map((e) => (e.id === next.id ? next : e)))}
      />

      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Create a superset?"
        className="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button onClick={confirmMerge}>
              <Link2 className="size-4" /> Create superset
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          <span className="text-ink">{pendingNames?.source}</span> will be performed back-to-back with{" "}
          <span className="text-ink">{pendingNames?.target}</span>, resting after each round. You can edit their sets together.
        </p>
      </Modal>
    </DndContext>
  );
}
