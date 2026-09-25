"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { busyCategory, WEEKDAYS } from "@/lib/options";
import { clamp, DAY_MIN, fmtRange, fmtTime, SNAP, snap } from "@/lib/schedule";
import type { BusyBlock } from "@/lib/types";
import { cn } from "../ui";

const HOUR_PX = 44;
const PX_PER_MIN = HOUR_PX / 60;
const MIN_LEN = SNAP;

type Drag =
  | { kind: "create"; day: number; anchor: number; current: number; top: number; moved: boolean }
  | { kind: "move"; id: string; offset: number; duration: number; top: number; moved: boolean }
  | { kind: "resize"; id: string; top: number };

export function WeekCalendar({
  blocks,
  wakeMin,
  sleepMin,
  selectedId,
  onChange,
  onSelect,
  newCategory,
}: {
  blocks: BusyBlock[];
  wakeMin: number;
  sleepMin: number;
  selectedId: string | null;
  onChange: (blocks: BusyBlock[]) => void;
  onSelect: (id: string | null) => void;
  /** Category given to newly drawn blocks */
  newCategory: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  // Keep latest props for the window listeners without re-binding on every render.
  const latest = useRef({ blocks, onChange, onSelect, newCategory });
  useLayoutEffect(() => {
    latest.current = { blocks, onChange, onSelect, newCategory };
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: Math.max(0, (wakeMin / 60 - 0.5) * HOUR_PX) });
    // Only on mount: don't yank the view around while the user edits wake time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!drag) return;
    const minuteAt = (y: number) => clamp(snap((y - drag.top) / PX_PER_MIN), 0, DAY_MIN);

    const onMove = (e: PointerEvent) => {
      const { blocks, onChange } = latest.current;
      const m = minuteAt(e.clientY);
      if (drag.kind === "create") {
        if (m !== drag.current) setDrag({ ...drag, current: m, moved: true });
      } else if (drag.kind === "move") {
        const b = blocks.find((x) => x.id === drag.id);
        if (!b) return;
        const start = clamp(snap((e.clientY - drag.top) / PX_PER_MIN - drag.offset), 0, DAY_MIN - drag.duration);
        if (start !== b.start) {
          onChange(blocks.map((x) => (x.id === b.id ? { ...x, start, end: start + drag.duration } : x)));
          if (!drag.moved) setDrag({ ...drag, moved: true });
        }
      } else {
        const b = blocks.find((x) => x.id === drag.id);
        if (!b) return;
        const end = clamp(m, b.start + MIN_LEN, DAY_MIN);
        if (end !== b.end) onChange(blocks.map((x) => (x.id === b.id ? { ...x, end } : x)));
      }
    };

    const onUp = () => {
      const { blocks, onChange, onSelect, newCategory } = latest.current;
      if (drag.kind === "create") {
        // A tap (no drag) creates a one-hour block, which also makes this usable on touch screens.
        let start = Math.min(drag.anchor, drag.current);
        let end = Math.max(drag.anchor, drag.current);
        if (!drag.moved || end - start < MIN_LEN) {
          start = drag.anchor;
          end = Math.min(DAY_MIN, start + 60);
        }
        const block: BusyBlock = { id: crypto.randomUUID(), category: newCategory, label: "", days: [drag.day], start, end };
        onChange([...blocks, block]);
        onSelect(block.id);
      } else if (drag.kind === "move" && !drag.moved) {
        onSelect(drag.id);
      }
      setDrag(null);
    };

    const onCancel = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [drag]);

  const columnTop = (el: HTMLElement) => el.closest("[data-day-col]")!.getBoundingClientRect().top;

  const startCreate = (e: ReactPointerEvent<HTMLDivElement>, day: number) => {
    if (e.button !== 0) return;
    const top = e.currentTarget.getBoundingClientRect().top;
    const anchor = clamp(Math.floor((e.clientY - top) / PX_PER_MIN / SNAP) * SNAP, 0, DAY_MIN - SNAP);
    onSelect(null);
    setDrag({ kind: "create", day, anchor, current: anchor + SNAP, top, moved: false });
  };

  const startMove = (e: ReactPointerEvent, b: BusyBlock) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const top = columnTop(e.currentTarget as HTMLElement);
    setDrag({ kind: "move", id: b.id, offset: (e.clientY - top) / PX_PER_MIN - b.start, duration: b.end - b.start, top, moved: false });
  };

  const startResize = (e: ReactPointerEvent, b: BusyBlock) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(b.id);
    setDrag({ kind: "resize", id: b.id, top: columnTop(e.currentTarget as HTMLElement) });
  };

  const todayIdx = (new Date().getDay() + 6) % 7;
  const sleepBands =
    sleepMin > wakeMin
      ? [
          [0, wakeMin],
          [sleepMin, DAY_MIN],
        ]
      : [[sleepMin, wakeMin]];

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-line bg-surface select-none", drag && "cursor-grabbing")}>
      {/* Day header */}
      <div className="grid grid-cols-[44px_repeat(7,1fr)] border-b border-line bg-surface-2/60">
        <span />
        {WEEKDAYS.map((d, i) => (
          <div key={d} className="py-2.5 text-center">
            <span className={cn("text-xs font-semibold", i === todayIdx ? "text-accent" : "text-muted")}>{d}</span>
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="scrollbar-thin relative h-[520px] overflow-y-auto">
        <div className="relative grid grid-cols-[44px_repeat(7,1fr)]" style={{ height: 24 * HOUR_PX }}>
          {/* Time gutter */}
          <div className="relative">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 font-mono text-[10px] text-faint"
                style={{ top: h * HOUR_PX }}
              >
                {fmtTime(h * 60, true)}
              </span>
            ))}
          </div>

          {WEEKDAYS.map((d, day) => (
            <div
              key={d}
              data-day-col
              className="relative cursor-crosshair border-l border-line"
              onPointerDown={(e) => startCreate(e, day)}
            >
              {/* hour lines */}
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/60" style={{ top: h * HOUR_PX }} />
              ))}

              {/* sleep shading */}
              {sleepBands.map(([s, e]) =>
                e > s ? (
                  <div
                    key={s}
                    className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.035)_0_6px,transparent_6px_12px)] bg-bg/60"
                    style={{ top: s * PX_PER_MIN, height: (e - s) * PX_PER_MIN }}
                  />
                ) : null,
              )}
              {blocks
                .filter((b) => b.days.includes(day))
                .map((b) => {
                  const cat = busyCategory(b.category);
                  const h = (b.end - b.start) * PX_PER_MIN;
                  const selected = b.id === selectedId;
                  return (
                    <div
                      key={b.id}
                      onPointerDown={(e) => startMove(e, b)}
                      className={cn(
                        "absolute inset-x-0.5 z-[2] cursor-grab touch-none overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left transition-shadow",
                        selected && "z-[3] ring-2 ring-ink/80",
                      )}
                      style={{
                        top: b.start * PX_PER_MIN + 1,
                        height: h - 2,
                        borderColor: cat.color,
                        background: `color-mix(in srgb, ${cat.color} ${selected ? 34 : 22}%, var(--color-surface))`,
                      }}
                    >
                      <p className="truncate text-[11px] font-semibold leading-tight text-ink">{b.label || cat.label}</p>
                      {h > 34 && <p className="truncate text-[10px] leading-tight text-ink/60">{fmtRange(b)}</p>}
                      <span
                        onPointerDown={(e) => startResize(e, b)}
                        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                        aria-hidden
                      />
                    </div>
                  );
                })}

              {drag?.kind === "create" && drag.day === day && drag.moved && (
                <div
                  className="pointer-events-none absolute inset-x-0.5 z-[4] rounded-md border border-dashed border-accent bg-accent/15 px-1.5 py-1 text-[10px] font-medium text-accent"
                  style={{
                    top: Math.min(drag.anchor, drag.current) * PX_PER_MIN,
                    height: Math.max(SNAP, Math.abs(drag.current - drag.anchor)) * PX_PER_MIN,
                  }}
                >
                  {fmtRange({ start: Math.min(drag.anchor, drag.current), end: Math.max(drag.anchor, drag.current, drag.anchor + SNAP) })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
