"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { ArrowLeft, Dumbbell, Flame, Gauge, Link2, ListOrdered, PersonStanding, RotateCcw, Route, Timer } from "lucide-react";
import { BLOCK_DISCIPLINES, EDITOR_KIND, sessionActivity } from "@/data/activities";
import { blockType } from "@/lib/options";
import { dayLabel, updateProgram } from "@/lib/programs";
import { useExerciseDB, type Exercise, type Sex } from "@/lib/explorer";
import { segmentDistanceKm, segmentMinutes } from "@/lib/load";
import { useProfile } from "@/lib/storage";
import type { CardioSegment, Program, ProgramBlock, SessionDetail, WorkoutEntry } from "@/lib/types";
import { entryHardSets, entryValue, newEntry, newExercise, SUPERSET_LETTERS } from "@/lib/workout";
import { ExerciseThumb } from "../../explorer/ExerciseBits";
import { CreateExerciseModal } from "../../explorer/CreateExerciseModal";
import { Modal } from "../../Modal";
import { Button, cn } from "../../ui";
import { CardioEditor, CardioLibrary, fmtDuration } from "./CardioEditor";
import { ExercisePicker, LIB } from "./ExercisePicker";
import { FatiguePanel } from "./FatiguePanel";
import { defaultSession, SessionEditor, SessionLibrary } from "./SessionEditor";
import { SetEditor } from "./SetEditor";
import { MERGE, WORKOUT, WorkoutList } from "./WorkoutList";

interface PendingMerge {
  targetId: string;
  sourceEntryId?: string;
  exerciseId?: string;
}

export const clearedBlock = (b: ProgramBlock): ProgramBlock => ({ id: b.id, type: b.type });
export const blockHasContent = (b: ProgramBlock) => !!(b.entries?.length || b.cardio?.length || b.session);

function ResetMenu({ label, canResetDay, onPick }: { label: string; canResetDay: boolean; onPick: (what: "block" | "day") => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (what: "block" | "day") => {
    onPick(what);
    setOpen(false);
  };
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted transition hover:border-danger/40 hover:text-danger"
      >
        <RotateCcw className="size-3.5" /> Reset
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-60 rounded-xl border border-line-strong bg-surface p-1 shadow-2xl">
          <button type="button" onClick={() => pick("block")} className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2">
            <span className="block text-sm text-ink">Reset {label}</span>
            <span className="block text-[11px] text-muted">Clear this activity and start clean</span>
          </button>
          {canResetDay && (
            <button type="button" onClick={() => pick("day")} className="w-full rounded-lg px-3 py-2 text-left hover:bg-surface-2">
              <span className="block text-sm text-ink">Reset whole day</span>
              <span className="block text-[11px] text-muted">Clear every activity on this day</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
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
  const kind = EDITOR_KIND[block.type] ?? "strength";
  const entries = block.entries ?? [];
  const segments = block.cardio ?? [];
  const session = block.session ?? defaultSession(block.type);

  const exercises = useMemo(() => new Map((db?.exercises ?? []).map((e) => [e.id, e])), [db]);

  const [editing, setEditing] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMerge | null>(null);
  const [confirmReset, setConfirmReset] = useState<"block" | "day" | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const updateDay = (fn: (blocks: ProgramBlock[]) => ProgramBlock[]) =>
    updateProgram(program.id, (p) => ({ ...p, days: p.days.map((d) => (d.id !== dayId ? d : { ...d, blocks: fn(d.blocks) })) }));
  const updateBlock = (fn: (b: ProgramBlock) => ProgramBlock) => updateDay((bs) => bs.map((b) => (b.id === blockId ? fn(b) : b)));
  const setEntries = (fn: (e: WorkoutEntry[]) => WorkoutEntry[]) => updateBlock((b) => ({ ...b, entries: fn(b.entries ?? []) }));
  const setSegments = (next: CardioSegment[]) => updateBlock((b) => ({ ...b, cardio: next }));
  const setSession = (next: SessionDetail) => updateBlock((b) => ({ ...b, session: next }));

  const addExercise = (exerciseId: string, index?: number) =>
    setEntries((es) => {
      const next = [...es];
      next.splice(index ?? next.length, 0, newEntry(exerciseId, exercises.get(exerciseId), kind === "mobility" ? 15 : 90));
      return next;
    });

  const doReset = () => {
    if (confirmReset === "block") updateBlock(clearedBlock);
    if (confirmReset === "day") updateDay((bs) => bs.map(clearedBlock));
    setConfirmReset(null);
    setEditing(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    const to = overIndex === -1 ? entries.length - 1 : overIndex;
    if (from !== -1 && from !== to) setEntries((es) => arrayMove(es, from, to));
  };

  const confirmMerge = () => {
    if (!pending) return;
    setEntries((es) => {
      const target = es.find((e) => e.id === pending.targetId);
      if (!target) return es;
      const source = pending.sourceEntryId ? es.find((e) => e.id === pending.sourceEntryId) : null;
      const added = source ? source.exercises : [newExercise(pending.exerciseId!, exercises.get(pending.exerciseId!))];
      return es.filter((e) => e.id !== source?.id).map((e) => (e.id === target.id ? { ...e, exercises: [...e.exercises, ...added] } : e));
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

  const Icon = bt.icon!;
  const stats = (() => {
    if (kind === "cardio") {
      const min = segments.reduce((a, s) => a + segmentMinutes(s), 0);
      const km = segments.reduce((a, s) => a + segmentDistanceKm(s), 0);
      return [
        { icon: Timer, value: fmtDuration(min), label: "total" },
        { icon: Route, value: units === "metric" ? `${km.toFixed(1)} km` : `${(km / 1.609344).toFixed(1)} mi`, label: "" },
      ];
    }
    if (kind === "session") {
      return [
        { icon: Timer, value: `${session.durationMin ?? 0} min`, label: sessionActivity(session.activity).label },
        { icon: Gauge, value: `RPE ${session.rpe}`, label: "" },
      ];
    }
    const hard = entries.reduce((a, e) => a + entryHardSets(e), 0);
    const bonus = entries.reduce((a, e) => a + entryValue(e), 0) - hard;
    const count = entries.reduce((a, e) => a + e.exercises.length, 0);
    const contacts = entries.reduce((a, e) => a + e.exercises.reduce((b, x) => b + x.sets.filter((s) => s.kind !== "warmup").reduce((c, s) => c + (s.reps ?? 0), 0), 0), 0);
    return [
      { icon: ListOrdered, value: String(count), label: "exercises" },
      kind === "plyo"
        ? { icon: Flame, value: String(contacts), label: "contacts" }
        : { icon: Flame, value: String(hard), label: kind === "mobility" ? "holds" : bonus > 0 ? "sets + techniques" : "sets" },
    ];
  })();

  const others = day.blocks.filter((b) => b.type !== "recovery");

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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
          <Link href={`/programs/${program.id}`} className="flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs font-medium hover:border-line-strong">
            <ArrowLeft className="size-3.5" /> Board
          </Link>
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${bt.color} 18%, transparent)`, color: bt.color }}>
              <Icon className="size-4" />
            </span>
            <div>
              <p className="font-display text-base font-semibold leading-tight">
                {dayLabel(program, dayIndex)} · {bt.label}
              </p>
              <p className="text-[11px] text-muted">{day.title || "Untitled day"}</p>
            </div>
          </div>
          {others.length > 1 && (
            <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
              {others.map((b) => (
                <Link
                  key={b.id}
                  href={`/programs/${program.id}?block=${b.id}`}
                  replace
                  className={cn("rounded-lg px-2.5 py-1 text-xs font-medium transition", b.id === blockId ? "bg-ink text-bg" : "text-muted hover:text-ink")}
                >
                  {blockType(b.type).label}
                </Link>
              ))}
            </div>
          )}
          <div className="ml-auto flex items-center gap-4 text-xs text-muted">
            {stats.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <s.icon className="size-3.5" />
                <span className="font-display text-sm font-semibold text-ink">{s.value}</span> {s.label}
              </span>
            ))}
            <ResetMenu label={bt.label.toLowerCase()} canResetDay={day.blocks.length > 1} onPick={setConfirmReset} />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)_minmax(280px,340px)]">
          <aside className="hidden min-h-0 flex-col border-r border-line p-4 lg:flex">
            <div className="mb-3 flex items-center gap-2">
              <PersonStanding className="size-4 text-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Fatigue & volume</h3>
            </div>
            <div className="min-h-0 flex-1">
              <FatiguePanel program={program} exercises={exercises} dayIndex={dayIndex} sex={sex} initialType={block.type} />
            </div>
          </aside>

          <section className="board-grid scrollbar-thin min-h-0 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto flex min-h-full max-w-2xl flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                  {kind === "cardio" ? "Session" : kind === "session" ? "Session details" : "Workout"}
                </h3>
                {kind !== "cardio" && kind !== "session" && entries.length > 1 && (
                  <span className="flex items-center gap-1 text-[11px] text-faint">
                    <Link2 className="size-3" /> Drop one exercise onto another to superset
                  </span>
                )}
              </div>
              {kind === "cardio" ? (
                <CardioEditor segments={segments} units={units} onChange={setSegments} />
              ) : kind === "session" ? (
                <SessionEditor block={block.type} session={session} onChange={setSession} />
              ) : db ? (
                <WorkoutList
                  entries={entries}
                  unitLabel={kind === "mobility" ? "holds" : "sets"}
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

          <aside className="flex min-h-[420px] flex-col border-t border-line lg:min-h-0 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <Dumbbell className="size-4 text-accent" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                {kind === "cardio" ? "Cardio library" : kind === "session" ? "Activities" : `${bt.label} library`}
              </h3>
            </div>
            <div className="min-h-0 flex-1">
              {kind === "cardio" ? (
                <CardioLibrary onAdd={(segs) => setSegments([...segments, ...segs])} />
              ) : kind === "session" ? (
                <SessionLibrary block={block.type} value={session.activity} onPick={(activity) => setSession({ ...session, activity })} />
              ) : db ? (
                <ExercisePicker
                  all={db.exercises}
                  disciplines={BLOCK_DISCIPLINES[block.type] ?? ["weights"]}
                  blockLabel={bt.label}
                  onAdd={(id) => addExercise(id)}
                  onCreate={(name) => setCreating(name)}
                />
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

      {kind !== "cardio" && kind !== "session" && (
        <SetEditor
          entry={entries.find((e) => e.id === editing) ?? null}
          letter={SUPERSET_LETTERS[entries.findIndex((e) => e.id === editing)] ?? ""}
          mode={kind}
          exercises={exercises}
          allExercises={db?.exercises ?? []}
          units={units}
          onClose={() => setEditing(null)}
          onChange={(next) => setEntries((es) => es.map((e) => (e.id === next.id ? next : e)))}
        />
      )}

      <CreateExerciseModal
        open={creating !== null}
        onClose={() => setCreating(null)}
        all={db?.exercises ?? []}
        initialName={creating ?? ""}
        initialDiscipline={(BLOCK_DISCIPLINES[block.type] ?? ["weights"])[0]}
        onSaved={(ex) => {
          setEntries((es) => [...es, newEntry(ex.id, ex, kind === "mobility" ? 15 : 90)]);
          setCreating(null);
        }}
        onUseExisting={(ex) => {
          addExercise(ex.id);
          setCreating(null);
        }}
        useExistingLabel="Add that instead"
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
          <span className="text-ink">{pendingNames?.source}</span> will be performed back-to-back with <span className="text-ink">{pendingNames?.target}</span>,
          resting after each round. You can edit their sets together.
        </p>
      </Modal>

      <Modal
        open={!!confirmReset}
        onClose={() => setConfirmReset(null)}
        title={confirmReset === "day" ? `Reset ${dayLabel(program, dayIndex)}?` : `Reset ${bt.label.toLowerCase()}?`}
        className="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmReset(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={doReset}>
              <RotateCcw className="size-4" /> Reset
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          {confirmReset === "day"
            ? `Everything programmed on ${dayLabel(program, dayIndex)} (${day.blocks.map((b) => blockType(b.type).label).join(", ")}) will be cleared. The activities stay on the board, empty.`
            : `All ${bt.label.toLowerCase()} work on ${dayLabel(program, dayIndex)} will be cleared so you can start clean.`}{" "}
          This can&apos;t be undone.
        </p>
      </Modal>
    </DndContext>
  );
}
