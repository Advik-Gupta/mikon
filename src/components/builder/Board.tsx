"use client";

import { useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "motion/react";
import { Copy, GripVertical, ListChecks, Moon, Pencil, Plus, RotateCcw, Settings2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { entryHardSets } from "@/lib/workout";
import { segmentMinutes } from "@/lib/load";
import { sessionActivity } from "@/data/activities";
import { blockHasContent, clearedBlock } from "./workout/BlockEditor";
import { BLOCK_TYPES, blockType } from "@/lib/options";
import { cycleSummary, dayLabel, newDay, weekdayOf } from "@/lib/programs";
import { fmtDuration, freeMinutesByDay } from "@/lib/schedule";
import { useProfile } from "@/lib/storage";
import type { Program, ProgramBlock, ProgramDay } from "@/lib/types";
import { cn } from "../ui";
import type { BuilderStepProps } from "./Builder";

const PALETTE = "palette:";
const paletteType = (id: string | null | undefined) => (id?.startsWith(PALETTE) ? id.split(":")[2] : undefined);
const DAY = "day:";

function BlockFace({
  type,
  onRemove,
  onOpen,
  summary,
  dragging,
  overlay,
}: {
  type: string;
  onRemove?: () => void;
  onOpen?: () => void;
  summary?: string;
  dragging?: boolean;
  overlay?: boolean;
}) {
  const t = blockType(type);
  const Icon = t.icon!;
  return (
    <div
      className={cn(
        "group/block relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-line bg-surface-2 py-2.5 pl-3.5 pr-2 transition",
        dragging && "opacity-30",
        overlay && "rotate-2 cursor-grabbing border-line-strong shadow-[0_18px_40px_-12px_rgb(0_0_0/0.8)]",
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1" style={{ background: t.color }} />
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${t.color} 18%, transparent)`, color: t.color }}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{t.label}</span>
        {summary && <span className="block truncate text-[11px] text-muted">{summary}</span>}
      </span>
      {onOpen && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onOpen}
          className="flex size-7 shrink-0 items-center justify-center rounded-md border border-line text-muted transition hover:border-accent/60 hover:bg-accent hover:text-accent-ink"
          title={`Build this ${t.label.toLowerCase()} session`}
          aria-label={`Build ${t.label}`}
        >
          <ListChecks className="size-3.5" />
        </button>
      )}
      {onRemove && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="rounded-md p-1 text-faint opacity-60 transition hover:bg-danger/10 hover:text-danger group-hover/block:opacity-100"
          aria-label={`Remove ${t.label}`}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function blockSummary(block: ProgramBlock) {
  if (block.cardio?.length) {
    const min = block.cardio.reduce((a, s) => a + segmentMinutes(s), 0);
    return `${block.cardio.length} segment${block.cardio.length === 1 ? "" : "s"} · ${Math.round(min)} min`;
  }
  if (block.session?.durationMin) return `${sessionActivity(block.session.activity).label} · ${block.session.durationMin} min`;
  const entries = block.entries ?? [];
  if (!entries.length) return undefined;
  const exercises = entries.reduce((a, e) => a + e.exercises.length, 0);
  const sets = entries.reduce((a, e) => a + entryHardSets(e), 0);
  return `${exercises} exercise${exercises === 1 ? "" : "s"} · ${sets} sets`;
}

function SortableBlock({ block, onRemove, onOpen }: { block: ProgramBlock; onRemove: () => void; onOpen?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="cursor-grab touch-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <BlockFace type={block.type} onRemove={onRemove} onOpen={onOpen} summary={blockSummary(block)} dragging={isDragging} />
    </div>
  );
}

function PaletteItem({ type, variant }: { type: string; variant: "side" | "strip" }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${PALETTE}${variant}:${type}` });
  const t = blockType(type);
  const Icon = t.icon!;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "group flex cursor-grab touch-none items-center gap-3 rounded-xl border border-line bg-surface-2 p-2.5 transition hover:border-line-strong hover:bg-surface-3 active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${t.color} 18%, transparent)`, color: t.color }}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{t.label}</span>
        <span className="block truncate text-[11px] text-muted">{t.description}</span>
      </span>
      <GripVertical className="size-4 shrink-0 text-faint opacity-0 transition group-hover:opacity-100" />
    </div>
  );
}

function DayColumn({
  program,
  day,
  index,
  highlight,
  freeMin,
  onTitle,
  onRemoveBlock,
  onOpenBlock,
  onDuplicate,
  onDelete,
  onReset,
}: {
  program: Program;
  day: ProgramDay;
  index: number;
  highlight: boolean;
  freeMin: number | null;
  onTitle: (t: string) => void;
  onRemoveBlock: (id: string) => void;
  onOpenBlock: (id: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: DAY + day.id });
  const rest = day.blocks.length === 0;
  const active = highlight || isOver;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group/day flex w-64 shrink-0 flex-col rounded-2xl border bg-surface transition-colors",
        active ? "border-accent/60 bg-accent/[0.03]" : "border-line",
      )}
    >
      <header className="border-b border-line px-3 pb-2.5 pt-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold">{dayLabel(program, index)}</span>
          {freeMin != null && <span className="text-[11px] text-faint">{fmtDuration(freeMin).replace(/ \d+m$/, "")} free</span>}
          <span className="ml-auto flex items-center">
            <span className="flex opacity-0 transition group-hover/day:opacity-100 focus-within:opacity-100">
            {day.blocks.some(blockHasContent) && (
              <button type="button" onClick={onReset} className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-ink" title="Reset day (clear its workouts)" aria-label="Reset day">
                <RotateCcw className="size-3.5" />
              </button>
            )}
            <button type="button" onClick={onDuplicate} className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-ink" title="Duplicate day" aria-label="Duplicate day">
              <Copy className="size-3.5" />
            </button>
            <button type="button" onClick={onDelete} className="rounded-md p-1 text-faint hover:bg-danger/10 hover:text-danger" title="Delete day" aria-label="Delete day">
              <Trash2 className="size-3.5" />
            </button>
            </span>
            <button
              type="button"
              className="ml-0.5 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-accent"
              title="Edit this day in detail (coming soon)"
              aria-label={`Edit ${dayLabel(program, index)} in detail`}
            >
              <Pencil className="size-3.5" />
            </button>
          </span>
        </div>
        <input
          value={day.title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder={rest ? "Rest day" : "Name this day"}
          className="mt-1 w-full rounded-md bg-transparent px-1 py-0.5 -ml-1 text-[13px] text-muted outline-none placeholder:text-faint hover:bg-surface-2 focus:bg-surface-2 focus:text-ink"
          aria-label={`${dayLabel(program, index)} title`}
        />
      </header>

      <SortableContext items={day.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-72 flex-1 flex-col gap-2 p-2.5">
          {day.blocks.map((b) => (
            <SortableBlock key={b.id} block={b} onRemove={() => onRemoveBlock(b.id)} onOpen={b.type === "recovery" ? undefined : () => onOpenBlock(b.id)} />
          ))}
          {rest ? (
            <div
              className={cn(
                "flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed px-3 text-center transition",
                active ? "border-accent/60 text-accent" : "border-line text-faint",
              )}
            >
              <Moon className="size-5" />
              <p className="mt-2 text-xs font-medium">Rest day</p>
              <p className="mt-0.5 text-[11px] opacity-80">Drop blocks here</p>
            </div>
          ) : (
            <div className={cn("min-h-10 flex-1 rounded-xl border border-dashed transition", active ? "border-accent/50" : "border-transparent")} />
          )}
        </div>
      </SortableContext>
    </motion.div>
  );
}

export function Board({ program, update, goTo }: BuilderStepProps) {
  const router = useRouter();
  const profile = useProfile();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const days = program.days;
  const free = profile ? freeMinutesByDay(profile.schedule) : null;
  const palette = BLOCK_TYPES.filter((b) => program.blockTypes.includes(b.id));
  const trainingDays = days.filter((d) => d.blocks.some((b) => b.type !== "recovery")).length;
  const counts = BLOCK_TYPES.map((t) => ({ t, n: days.reduce((a, d) => a + d.blocks.filter((b) => b.type === t.id).length, 0) })).filter((c) => c.n);

  const setDays = (fn: (days: ProgramDay[]) => ProgramDay[]) => update((p) => ({ ...p, days: fn(p.days) }));

  const setDayCount = (fn: (days: ProgramDay[]) => ProgramDay[]) =>
    update((p) => {
      const next = fn(p.days);
      const cycle = p.structure.cycle === "freeform" ? "freeform" : "custom";
      return { ...p, days: next, structure: { ...p.structure, cycle, cycleDays: next.length } };
    });

  const collision: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    const dayHit = hits.find((h) => String(h.id).startsWith(DAY));
    if (!dayHit) return hits.length ? hits : rectIntersection(args);
    const day = days.find((d) => DAY + d.id === dayHit.id);
    const ids = new Set(day?.blocks.map((b) => b.id));
    const blockHit = hits.find((h) => ids.has(String(h.id)));
    if (blockHit) return [blockHit];
    const y = args.pointerCoordinates?.y;
    const lastRect = day?.blocks.length ? args.droppableRects.get(day.blocks[day.blocks.length - 1].id) : undefined;
    if (!lastRect || y == null || y > lastRect.bottom) return [dayHit];
    const nearest = closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => ids.has(String(c.id))) });
    return nearest.length ? [nearest[0]] : [dayHit];
  };

  const dayOf = (id: string) => (id.startsWith(DAY) ? id.slice(DAY.length) : days.find((d) => d.blocks.some((b) => b.id === id))?.id);

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const overId = over ? String(over.id) : null;
    const to = overId ? dayOf(overId) : undefined;
    const activeKey = String(active.id);
    if (activeKey.startsWith(PALETTE)) {
      setOverDay(to ?? null);
      return;
    }
    const from = dayOf(activeKey);
    if (!overId || !from || !to || from === to) return;
    setDays((ds) => {
      const block = ds.find((d) => d.id === from)!.blocks.find((b) => b.id === activeKey)!;
      return ds.map((d) => {
        if (d.id === from) return { ...d, blocks: d.blocks.filter((b) => b.id !== activeKey) };
        if (d.id === to) {
          const idx = overId.startsWith(DAY) ? d.blocks.length : Math.max(0, d.blocks.findIndex((b) => b.id === overId));
          const blocks = [...d.blocks];
          blocks.splice(idx, 0, block);
          return { ...d, blocks };
        }
        return d;
      });
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setOverDay(null);
    if (!over) return;
    const activeKey = String(active.id);
    const overId = String(over.id);
    const to = dayOf(overId);
    if (!to) return;

    if (activeKey.startsWith(PALETTE)) {
      const block: ProgramBlock = { id: crypto.randomUUID(), type: paletteType(activeKey)! };
      setDays((ds) =>
        ds.map((d) => {
          if (d.id !== to) return d;
          const idx = overId.startsWith(DAY) ? d.blocks.length : d.blocks.findIndex((b) => b.id === overId);
          const blocks = [...d.blocks];
          blocks.splice(idx < 0 ? blocks.length : idx, 0, block);
          return { ...d, blocks };
        }),
      );
      return;
    }

    setDays((ds) =>
      ds.map((d) => {
        if (d.id !== to) return d;
        const from = d.blocks.findIndex((b) => b.id === activeKey);
        const toIdx = overId.startsWith(DAY) ? d.blocks.length - 1 : d.blocks.findIndex((b) => b.id === overId);
        return from < 0 || toIdx < 0 || from === toIdx ? d : { ...d, blocks: arrayMove(d.blocks, from, toIdx) };
      }),
    );
  };

  const activeType = activeId?.startsWith(PALETTE)
    ? paletteType(activeId)
    : days.flatMap((d) => d.blocks).find((b) => b.id === activeId)?.type;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverDay(null);
      }}
    >
      <div className="flex min-h-0 flex-1">
        <aside className="scrollbar-thin hidden w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface/40 p-4 md:flex">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Blocks</p>
          <p className="mb-4 mt-1 text-xs text-muted">Drag onto any day.</p>
          <div className="space-y-2">
            {palette.map((b) => (
              <PaletteItem key={b.id} type={b.id} variant="side" />
            ))}
          </div>
          <button
            type="button"
            onClick={() => goTo("training")}
            className="mt-4 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Settings2 className="size-3.5" /> Edit training types
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => goTo("structure")}
              className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-xs font-medium hover:border-line-strong"
              title="Change structure"
            >
              {cycleSummary(program)} · {days.length} day{days.length === 1 ? "" : "s"}
            </button>
            <span className="text-xs text-muted">
              <span className="text-ink">{trainingDays}</span> training · <span className="text-ink">{days.length - trainingDays}</span> rest
              {profile && weekdayOf(program, 0) != null && (
                <span className="text-faint"> · you usually train {profile.schedule.daysPerWeek}×/week</span>
              )}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {counts.map(({ t, n }) => (
                <span key={t.id} className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                  <span className="size-1.5 rounded-full" style={{ background: t.color }} />
                  {t.label} <span className="tabular-nums text-ink">{n}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="scrollbar-thin flex gap-2 overflow-x-auto border-b border-line px-4 py-3 md:hidden">
            {palette.map((b) => (
              <div key={b.id} className="w-44 shrink-0">
                <PaletteItem type={b.id} variant="strip" />
              </div>
            ))}
          </div>

          <div className="board-grid scrollbar-thin min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <div className="flex min-h-full w-max min-w-full items-stretch gap-4 p-4 sm:p-6">
              <AnimatePresence initial={false}>
                {days.map((d, i) => {
                  const wd = weekdayOf(program, i);
                  return (
                    <DayColumn
                      key={d.id}
                      program={program}
                      day={d}
                      index={i}
                      highlight={overDay === d.id && !!activeId?.startsWith(PALETTE)}
                      freeMin={free && wd != null ? free[wd] : null}
                      onTitle={(title) => setDays((ds) => ds.map((x) => (x.id === d.id ? { ...x, title } : x)))}
                      onOpenBlock={(id) => router.push(`/programs/${program.id}?block=${id}`)}
                      onRemoveBlock={(id) => setDays((ds) => ds.map((x) => (x.id === d.id ? { ...x, blocks: x.blocks.filter((b) => b.id !== id) } : x)))}
                      onDuplicate={() =>
                        setDayCount((ds) => {
                          const copy: ProgramDay = { ...newDay(), title: d.title, blocks: d.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })) };
                          return [...ds.slice(0, i + 1), copy, ...ds.slice(i + 1)];
                        })
                      }
                      onReset={() => {
                        if (!window.confirm(`Clear everything programmed on ${dayLabel(program, i)}? The activities stay on the board, empty.`)) return;
                        setDays((ds) => ds.map((x) => (x.id === d.id ? { ...x, blocks: x.blocks.map(clearedBlock) } : x)));
                      }}
                      onDelete={() => {
                        if (days.length <= 1) return;
                        if (d.blocks.length && !window.confirm(`Delete ${dayLabel(program, i)} and its ${d.blocks.length} block(s)?`)) return;
                        setDayCount((ds) => ds.filter((x) => x.id !== d.id));
                      }}
                    />
                  );
                })}
              </AnimatePresence>
              <button
                type="button"
                onClick={() => setDayCount((ds) => [...ds, newDay()])}
                className="flex w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-sm text-muted transition hover:border-accent/60 hover:text-accent"
              >
                <Plus className="size-5" />
                Add day
              </button>
            </div>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
        {activeType ? (
          <div className="w-60">
            <BlockFace type={activeType} overlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
