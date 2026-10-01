"use client";

import { motion } from "motion/react";
import { Check, ChevronRight, Delete, KeyboardOff, Minus, Plus } from "lucide-react";
import { cn } from "../ui";

export type Field = "weight" | "reps" | "hold";

const RIR = [0, 1, 2, 3, 4, 5, 6];
export const RIR_COLOR = ["#ef4444", "#ef4444", "#f59e0b", "#f59e0b", "#22c55e", "#22c55e", "#3b82f6"];

export function Keypad({
  field,
  buffer,
  rir,
  unit,
  onKey,
  onStep,
  onRir,
  onNext,
  onDone,
  onClose,
}: {
  field: Field;
  buffer: string;
  rir: number | null;
  unit: string;
  onKey: (k: string) => void;
  onStep: (dir: 1 | -1) => void;
  onRir: (v: number | null) => void;
  onNext: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const key = (k: string, label = k) => (
    <button
      key={k}
      type="button"
      onClick={() => onKey(k)}
      className="flex h-14 items-center justify-center rounded-2xl font-display text-[26px] font-medium transition active:scale-95 active:bg-surface-3"
      aria-label={k === "back" ? "Delete" : label}
    >
      {k === "back" ? <Delete className="size-6" /> : label}
    </button>
  );
  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", bounce: 0, duration: 0.28 }}
      role="group"
      aria-label="Keypad"
      className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      onPointerDown={(e) => e.preventDefault()}
    >
      {field !== "weight" && (
        <div className="flex items-center justify-between gap-1 border-b border-line px-3 py-2.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">RIR</span>
          {RIR.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onRir(rir === v ? null : v)}
              className={cn("flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white transition active:scale-90", rir === v && "ring-2 ring-white ring-offset-2 ring-offset-surface")}
              style={{ background: RIR_COLOR[v] }}
              aria-label={`${v === 6 ? "6 or more" : v} reps in reserve`}
            >
              {v === 6 ? "6+" : v}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[1fr_1fr_1fr_1.15fr] gap-1.5 p-2">
        <div className="col-span-3 grid grid-cols-3 gap-1">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => key(k))}
          {field === "weight" ? key(".", ".") : <span />}
          {key("0")}
          {key("back")}
        </div>
        <div className="grid grid-rows-4 gap-1.5">
          <button type="button" onClick={onClose} className="flex items-center justify-center rounded-2xl bg-surface-2 text-muted active:scale-95" aria-label="Hide keypad">
            <KeyboardOff className="size-5" />
          </button>
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
            <button type="button" onClick={() => onStep(-1)} className="flex items-center justify-center rounded-xl active:bg-surface-3" aria-label="Decrease">
              <Minus className="size-4" />
            </button>
            <button type="button" onClick={() => onStep(1)} className="flex items-center justify-center rounded-xl active:bg-surface-3" aria-label="Increase">
              <Plus className="size-4" />
            </button>
          </div>
          <button type="button" onClick={onNext} className="flex items-center justify-center gap-1 rounded-2xl bg-surface-2 text-sm font-semibold active:scale-95">
            Next <ChevronRight className="size-4" />
          </button>
          <button type="button" onClick={onDone} className="flex items-center justify-center rounded-2xl bg-accent text-accent-ink active:scale-95" aria-label="Complete set">
            <Check className="size-6" strokeWidth={3} />
          </button>
        </div>
      </div>
      <p className="pb-1.5 text-center text-[10px] text-faint">
        {buffer ? `${buffer}${field === "weight" ? ` ${unit}` : field === "hold" ? " s" : " reps"}` : "Type a value"}
      </p>
    </motion.div>
  );
}
