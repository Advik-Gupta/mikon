"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Flag,
  Flame,
  GripVertical,
  Info,
  Link2,
  Menu,
  NotebookPen,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat2,
  Timer,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { muscleById } from "@/data/muscles";
import { kgToLb, lbToKg, round1 } from "@/lib/body";
import { musclesForExercise, useExerciseDB, type Exercise } from "@/lib/explorer";
import { seriesFor } from "@/lib/metrics";
import { useLogs, useProfile, useSessionUser } from "@/lib/storage";
import {
  clearWorkout,
  elapsedMs,
  finishWorkout,
  flushPending,
  fmtClock,
  lastPerformance,
  newTrackSet,
  onOpenStart,
  personalBests,
  trackExercise,
  updateWorkout,
  useActiveWorkout,
  useNow,
  warmupSets,
  workoutStats,
  type ActiveWorkout,
  type TrackExercise,
  type TrackSet,
} from "@/lib/tracker";
import type { WorkoutLog } from "@/lib/types";
import { ExerciseImages, ExerciseThumb } from "../explorer/ExerciseBits";
import { toast } from "../Toaster";
import { Guide, type GuideStep } from "../tour/Guide";
import { useOverlay } from "@/lib/overlay";
import { Button, cn } from "../ui";
import { ExerciseSheet } from "./ExerciseSheet";
import { Keypad, RIR_COLOR, type Field } from "./Keypad";
import { Sheet } from "./Sheet";
import { StartSheet } from "./StartSheet";
import { WorkoutSummary } from "./WorkoutSummary";

const TRACKER_GUIDE: GuideStep[] = [
  {
    target: "tracker-strip",
    place: "bottom",
    title: "Your exercises",
    body: "Tap a picture or swipe the screen sideways to move between exercises. Use + to add more.",
  },
  {
    target: "tracker-sets",
    place: "top",
    title: "Log each set",
    body: "Tap a number to type it on the keypad, add how many reps you had left in the tank, then tick the set.",
  },
  {
    target: "tracker-rest",
    place: "bottom",
    title: "Rest timer",
    body: "Ticking a set starts your rest. It keeps counting even if you leave the app, and pings you when it's time.",
  },
  {
    target: "tracker-menu",
    place: "bottom",
    title: "Minimize anytime",
    body: "Pause, minimize to browse the rest of Mikon, or finish your workout from this menu.",
  },
];

const REST_PRESETS = [30, 60, 90, 120, 150, 180, 240, 300];

let audio: AudioContext | null = null;
function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") audio.resume();
  } catch {}
}
function beep() {
  if (!audio) return;
  [0, 0.22, 0.44].forEach((t) => {
    const o = audio!.createOscillator();
    const g = audio!.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, audio!.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.25, audio!.currentTime + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audio!.currentTime + t + 0.18);
    o.connect(g).connect(audio!.destination);
    o.start(audio!.currentTime + t);
    o.stop(audio!.currentTime + t + 0.2);
  });
}

function postToWorker(msg: unknown) {
  navigator.serviceWorker?.controller?.postMessage(msg);
}

function useRestAlarm(w: ActiveWorkout | null, now: number) {
  const fired = useRef<number | null>(null);
  const rest = w?.rest;
  useEffect(() => {
    if (!rest || now < rest.endsAt || fired.current === rest.endsAt) return;
    fired.current = rest.endsAt;
    if (now - rest.endsAt < 8000) {
      navigator.vibrate?.([220, 120, 220]);
      beep();
      toast({ tone: "info", title: "Rest's over", message: "Time for your next set." });
    }
    updateWorkout((x) => ({ ...x, rest: null }));
  }, [now, rest]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden" && rest && typeof Notification !== "undefined" && Notification.permission === "granted") {
        postToWorker({ type: "rest-timer", endsAt: rest.endsAt });
      } else postToWorker({ type: "rest-cancel" });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [rest]);
}

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    const get = () =>
      (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
        .request("screen")
        .then((l) => (lock = l))
        .catch(() => null);
    get();
    const onVis = () => document.visibilityState === "visible" && get();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => null);
    };
  }, [active]);
}

const setLabel = (sets: TrackSet[], i: number) => {
  if (sets[i].kind === "warmup") return "W";
  return String(sets.slice(0, i + 1).filter((s) => s.kind !== "warmup").length);
};

function updateExercise(id: string, fn: (x: TrackExercise) => TrackExercise) {
  updateWorkout((w) => ({ ...w, exercises: w.exercises.map((x) => (x.id === id ? fn(x) : x)) }));
}

function RestPill({ w, now, onOpen }: { w: ActiveWorkout; now: number; onOpen: () => void }) {
  const left = w.rest ? Math.max(0, w.rest.endsAt - now) : 0;
  const pct = w.rest ? left / (w.rest.total * 1000) : 0;
  return (
    <button
      type="button"
      data-tour="tracker-rest"
      onClick={onOpen}
      className="flex min-w-0 flex-1 items-center justify-end gap-2.5"
      aria-label="Rest timer"
    >
      <span className={cn("flex items-center gap-1.5 font-display text-xl font-semibold tabular-nums", w.rest ? "text-ink" : "text-muted")}>
        <Timer className={cn("size-5", w.rest && "text-accent")} /> {fmtClock(left)}
      </span>
      <span className="relative h-2.5 w-20 overflow-hidden rounded-full bg-surface-3 sm:w-24">
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.4, ease: "linear" }}
        />
      </span>
    </button>
  );
}

function BestChip({ exerciseId, logs, units }: { exerciseId: string; logs: WorkoutLog[]; units: "metric" | "imperial" }) {
  const series = useMemo(() => seriesFor(logs, exerciseId, "e1rm"), [logs, exerciseId]);
  if (!series.length) return null;
  const best = Math.max(...series.map((p) => p.value));
  const first = series[0].value;
  const delta = best - first;
  const fmt = (kg: number) => (units === "metric" ? `${round1(kg)} kg` : `${Math.round(kgToLb(kg))} lb`);
  return (
    <div className="flex shrink-0 flex-col items-center rounded-2xl border border-accent/30 bg-accent/[0.07] px-3 py-1.5 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">Best e1RM</span>
      <span className="font-display text-base font-semibold tabular-nums">{fmt(best)}</span>
      {delta > 0 && (
        <span className="text-[10px] tabular-nums text-muted">
          +{fmt(delta)} ({Math.round((delta / first) * 100)}%)
        </span>
      )}
    </div>
  );
}

const stopPaneDrag = (el: HTMLDivElement | null) => {
  if (el && !el.dataset.stop) {
    el.dataset.stop = "1";
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
  }
};

function ExercisePane({
  w,
  x,
  ex,
  logs,
  units,
  editing,
  onEdit,
  onToggle,
  onSetMenu,
  onDelete,
}: {
  w: ActiveWorkout;
  x: TrackExercise;
  ex: Exercise | undefined;
  logs: WorkoutLog[];
  units: "metric" | "imperial";
  editing: { setId: string; field: Field } | null;
  onEdit: (setId: string, field: Field) => void;
  onToggle: (s: TrackSet) => void;
  onSetMenu: (s: TrackSet) => void;
  onDelete: (s: TrackSet) => void;
}) {
  const prev = useMemo(() => lastPerformance(logs, x.exerciseId, w.id), [logs, x.exerciseId, w.id]);
  const timed = x.sets.some((s) => s.timed);
  const showWeight = !timed && (ex?.equipment !== "body only" || x.sets.some((s) => s.weight));
  const unit = units === "metric" ? "kg" : "lb";
  const shown = (kg: number | null) => (kg == null ? "" : units === "metric" ? String(round1(kg)) : String(Math.round(kgToLb(kg))));
  const prevText = (i: number) => {
    const p = prev?.sets[i];
    if (!p) return null;
    const amount = p.holdSec != null && p.reps == null ? `${p.holdSec}s` : `${p.reps ?? 0}`;
    return { main: p.weight ? `${shown(p.weight)} ${unit} × ${amount}` : timed ? amount : `${amount} reps`, rir: p.rir };
  };
  const allDone = x.sets.length > 0 && x.sets.every((s) => s.done);

  const cell = (s: TrackSet, field: Field, value: string, placeholder: string) => {
    const active = editing?.setId === s.id && editing.field === field;
    return (
      <button
        type="button"
        onClick={() => onEdit(s.id, field)}
        className={cn(
          "relative flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl text-[17px] font-medium tabular-nums transition",
          active ? "bg-surface-2 ring-2 ring-ink" : s.done ? "bg-accent/10 text-ink" : "bg-surface-2 text-ink",
        )}
      >
        {value || <span className="text-faint">{placeholder}</span>}
        {active && <span className="absolute right-3 h-5 w-0.5 animate-pulse bg-ink" />}
        {field !== "weight" && s.rir != null && (
          <span
            className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-bg"
            style={{ background: RIR_COLOR[Math.min(6, s.rir)] }}
          >
            {s.rir >= 6 ? "6+" : s.rir}
          </span>
        )}
      </button>
    );
  };

  return (
    <div data-tour="tracker-sets">
      <div className="grid grid-cols-[2.75rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 px-1 pb-2 text-xs font-medium text-muted">
        <span className="text-center">Set</span>
        <span className="text-center">Previous</span>
        {showWeight ? <span className="text-center">{unit}</span> : <span />}
        <span className="text-center">{timed ? "Secs" : "Reps"}</span>
        <button
          type="button"
          onClick={() => x.sets.forEach((s) => s.done === allDone && onToggle(s))}
          className={cn(
            "mx-auto flex size-8 items-center justify-center rounded-lg border-2 transition",
            allDone ? "border-accent bg-accent text-accent-ink" : "border-line-strong",
          )}
          aria-label="Complete all sets"
        >
          {allDone && <Check className="size-4" strokeWidth={3} />}
        </button>
      </div>
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {x.sets.map((s, i) => {
            const p = prevText(i);
            const warm = s.kind === "warmup";
            return (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -120, height: 0 }}
                className="relative overflow-hidden rounded-2xl"
              >
                <span className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-end rounded-2xl bg-danger pr-5 text-white">
                  <Trash2 className="size-5" />
                </span>
                <motion.div
                  ref={stopPaneDrag}
                  drag="x"
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={{ left: 0.7, right: 0 }}
                  dragSnapToOrigin
                  onDragEnd={(_, info) => (info.offset.x < -100 || info.velocity.x < -700) && onDelete(s)}
                  className="relative grid grid-cols-[2.75rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2 bg-bg px-1 py-0.5"
                >
                  <button
                    type="button"
                    onClick={() => onSetMenu(s)}
                    className={cn(
                      "mx-auto flex size-11 items-center justify-center rounded-full font-display text-base font-semibold transition",
                      warm ? "bg-warn/15 text-warn" : s.done ? "bg-accent/15 text-accent" : "bg-surface-2 text-ink",
                    )}
                    aria-label={`Set ${i + 1} options`}
                  >
                    {setLabel(x.sets, i)}
                  </button>
                  <button
                    type="button"
                    disabled={!p}
                    onClick={() =>
                      p &&
                      updateExercise(x.id, (e) => ({
                        ...e,
                        sets: e.sets.map((y) =>
                          y.id === s.id ? { ...y, weight: prev!.sets[i].weight, reps: prev!.sets[i].reps, holdSec: prev!.sets[i].holdSec } : y,
                        ),
                      }))
                    }
                    className="min-w-0 text-center leading-tight"
                  >
                    {p ? (
                      <>
                        <span className="block truncate text-[13px] text-ink/80">{p.main}</span>
                        {p.rir != null && <span className="block text-[11px] text-muted">{p.rir} RIR</span>}
                      </>
                    ) : (
                      <span className="text-xs text-faint">-</span>
                    )}
                  </button>
                  {showWeight ? cell(s, "weight", shown(s.weight), p?.main.includes(unit) ? shown(prev!.sets[i].weight) : unit) : <span />}
                  {timed
                    ? cell(s, "hold", s.holdSec != null ? String(s.holdSec) : "", "sec")
                    : cell(s, "reps", s.reps != null ? String(s.reps) : "", "reps")}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    onClick={() => onToggle(s)}
                    className={cn(
                      "mx-auto flex size-11 items-center justify-center rounded-xl border-2 transition-colors",
                      s.done ? "border-accent bg-accent text-accent-ink" : "border-line-strong text-transparent",
                    )}
                    aria-label={`Set ${i + 1} ${s.done ? "done" : "not done"}`}
                    aria-pressed={s.done}
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: s.done ? 1 : 0.4, opacity: s.done ? 1 : 0 }}
                      transition={{ type: "spring", bounce: 0.6, duration: 0.35 }}
                    >
                      <Check className="size-5" strokeWidth={3.2} />
                    </motion.span>
                  </motion.button>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => {
          const last = x.sets.at(-1);
          updateExercise(x.id, (e) => ({
            ...e,
            sets: [
              ...e.sets,
              newTrackSet({ weight: last?.weight ?? null, reps: last?.reps ?? null, holdSec: last?.holdSec ?? null, timed: last?.timed }),
            ],
          }));
        }}
        className="ml-1 mt-4 flex size-11 items-center justify-center rounded-full bg-surface-2 text-ink transition active:scale-90"
        aria-label="Add set"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}

function ExpandedTracker({ w, onFinished }: { w: ActiveWorkout; onFinished: (log: WorkoutLog) => void }) {
  const profile = useProfile();
  const logs = useLogs() ?? [];
  const { db } = useExerciseDB();
  const exercises = useMemo(() => new Map((db?.exercises ?? []).map((e) => [e.id, e])), [db]);
  const units = profile?.body.units ?? "metric";
  const now = useNow(250);
  const [dir, setDir] = useState(1);
  const [editing, setEditing] = useState<{ setId: string; field: Field; buffer: string; fresh: boolean } | null>(null);
  const [sheet, setSheet] = useState<
    null | "add" | "swap" | "menu" | "rest" | "rest-auto" | "note" | "info" | "finish" | "discard" | "rename" | "reorder"
  >(null);
  const [setMenu, setSetMenu] = useState<TrackSet | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [nameDraft, setNameDraft] = useState(w.name);
  useWakeLock(true);
  useOverlay(true);

  const index = Math.min(w.current, Math.max(0, w.exercises.length - 1));
  const x = w.exercises[index];
  const ex = x ? exercises.get(x.exerciseId) : undefined;
  const elapsed = elapsedMs(w, now);
  const working = x ? x.sets.filter((s) => s.kind !== "warmup") : [];
  const nextUp = working.findIndex((s) => !s.done);

  const go = (i: number) => {
    if (i < 0 || i >= w.exercises.length || i === index) return;
    setDir(i > index ? 1 : -1);
    setEditing(null);
    updateWorkout((y) => ({ ...y, current: i }));
  };

  const setOf = (id: string) => x?.sets.find((s) => s.id === id);
  const patchSet = (id: string, patch: Partial<TrackSet>) =>
    x && updateExercise(x.id, (e) => ({ ...e, sets: e.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const toggle = (s: TrackSet) => {
    if (!x) return;
    unlockAudio();
    const done = !s.done;
    const prev = lastPerformance(logs, x.exerciseId, w.id)?.sets[x.sets.indexOf(s)];
    const fill =
      done && s.reps == null && s.holdSec == null && prev ? { weight: s.weight ?? prev.weight, reps: prev.reps, holdSec: prev.holdSec } : {};
    const exercisesNext = w.exercises.map((e) =>
      e.id === x.id ? { ...e, sets: e.sets.map((z) => (z.id === s.id ? { ...z, ...fill, done } : z)) } : e,
    );
    const allDone = exercisesNext.every((e) => e.sets.every((z) => z.done));
    const open = (e: TrackExercise) => e.sets.some((z) => !z.done);
    const group = x.supersetId ? exercisesNext.filter((e) => e.supersetId === x.supersetId) : [];
    const me = group.findIndex((e) => e.id === x.id);
    const laterInRound = group.slice(me + 1).find(open);
    const startRest = done && !allDone && !(group.length > 1 && laterInRound);
    updateWorkout((y) => ({
      ...y,
      exercises: exercisesNext,
      rest: startRest ? { endsAt: Date.now() + x.restSec * 1000, total: x.restSec } : done && allDone ? null : y.rest,
    }));
    if (!done) return;
    navigator.vibrate?.(15);
    if (startRest) setSheet("rest-auto");
    let target: TrackExercise | undefined;
    if (group.length > 1) target = laterInRound ?? group.find(open);
    else if (!open(exercisesNext[index]) && index < w.exercises.length - 1) target = exercisesNext[index + 1];
    if (target && target.id !== x.id) {
      const to = exercisesNext.findIndex((e) => e.id === target!.id);
      setTimeout(() => go(to), group.length > 1 ? 350 : 650);
    }
  };

  const edit = (setId: string, field: Field) => setEditing({ setId, field, buffer: "", fresh: true });
  const current = editing ? setOf(editing.setId) : undefined;
  const valueOf = (s: TrackSet, f: Field) =>
    f === "weight"
      ? s.weight == null
        ? null
        : units === "metric"
          ? round1(s.weight)
          : Math.round(kgToLb(s.weight))
      : f === "hold"
        ? s.holdSec
        : s.reps;
  const commit = (raw: string) => {
    if (!editing || !current) return;
    const n = raw === "" || raw === "." ? null : Number(raw);
    if (editing.field === "weight") patchSet(current.id, { weight: n == null ? null : units === "metric" ? n : lbToKg(n) });
    else if (editing.field === "hold") patchSet(current.id, { holdSec: n == null ? null : Math.round(n) });
    else patchSet(current.id, { reps: n == null ? null : Math.round(n) });
  };
  const onKey = (k: string) => {
    if (!editing) return;
    let b = editing.fresh ? "" : editing.buffer;
    if (k === "back") b = editing.fresh ? "" : b.slice(0, -1);
    else if (k === "." && (b.includes(".") || editing.field !== "weight")) return;
    else if (b.replace(".", "").length >= 5) return;
    else b = b === "0" && k !== "." ? k : b + k;
    setEditing({ ...editing, buffer: b, fresh: false });
    commit(b);
  };
  const step = (d: 1 | -1) => {
    if (!editing || !current) return;
    const base = valueOf(current, editing.field) ?? 0;
    const inc = editing.field === "weight" ? (units === "metric" ? 2.5 : 5) : editing.field === "hold" ? 5 : 1;
    const v = Math.max(0, round1(base + d * inc));
    setEditing({ ...editing, buffer: String(v), fresh: true });
    commit(String(v));
  };
  const next = () => {
    if (!editing || !x) return;
    const i = x.sets.findIndex((s) => s.id === editing.setId);
    const timed = x.sets[i]?.timed;
    const showWeight = !timed && (ex?.equipment !== "body only" || x.sets.some((s) => s.weight));
    if (editing.field === "weight") return edit(editing.setId, timed ? "hold" : "reps");
    const n = x.sets[i + 1];
    if (!n) return setEditing(null);
    edit(n.id, showWeight ? "weight" : timed ? "hold" : "reps");
  };

  const addExercises = (ids: string[]) => {
    updateWorkout((y) => ({
      ...y,
      exercises: [...y.exercises, ...ids.map((id) => trackExercise(id, exercises.get(id)))],
      current: y.exercises.length,
    }));
    setDir(1);
  };
  const swap = (id: string) => x && updateExercise(x.id, (e) => ({ ...e, exerciseId: id, sets: e.sets.map((s) => ({ ...s, done: false })) }));
  const linkNext = () =>
    updateWorkout((y) => {
      const next = y.exercises[index + 1];
      if (!next) return y;
      const id = next.supersetId ?? crypto.randomUUID();
      return { ...y, exercises: y.exercises.map((e, i) => (i === index || i === index + 1 ? { ...e, supersetId: id } : e)) };
    });
  const unlinkSuperset = (id: string) =>
    updateWorkout((y) => {
      const sid = y.exercises.find((e) => e.id === id)?.supersetId;
      const left = y.exercises.filter((e) => e.supersetId === sid && e.id !== id);
      return {
        ...y,
        exercises: y.exercises.map((e) => (e.id === id || (left.length < 2 && e.supersetId === sid) ? { ...e, supersetId: undefined } : e)),
      };
    });
  const minimize = () => {
    setEditing(null);
    updateWorkout((y) => ({ ...y, minimized: true }));
  };
  const togglePause = () =>
    updateWorkout((y) => (y.pausedAt ? { ...y, pausedMs: y.pausedMs + (Date.now() - y.pausedAt), pausedAt: null } : { ...y, pausedAt: Date.now() }));

  const done = workoutStats({ exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets })) });
  const skipped = w.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.done).length, 0);
  const finish = async () => {
    postToWorker({ type: "rest-cancel" });
    const log = await finishWorkout(w);
    onFinished(log);
  };

  const chip = "flex shrink-0 items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5 text-[15px] font-medium transition active:scale-95";

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="fixed inset-0 z-[80] flex flex-col bg-bg pt-[env(safe-area-inset-top)] md:inset-auto md:bottom-4 md:right-4 md:top-4 md:w-[440px] md:overflow-hidden md:rounded-[28px] md:border md:border-line-strong md:shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]"
    >
      <header className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-3">
        <button
          type="button"
          data-tour="tracker-menu"
          onClick={() => setSheet("menu")}
          className="-ml-1 rounded-xl p-2 active:bg-surface-2"
          aria-label="Workout options"
        >
          <Menu className="size-6" />
        </button>
        <button
          type="button"
          onClick={togglePause}
          className="flex items-center gap-1.5 font-display text-xl font-semibold tabular-nums"
          aria-label={w.pausedAt ? "Resume workout" : "Pause workout"}
        >
          {fmtClock(elapsed)}
          {w.pausedAt && <span className="rounded-md bg-warn/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-warn">Paused</span>}
        </button>
        <RestPill w={w} now={now} onOpen={() => setSheet("rest")} />
        <button type="button" onClick={minimize} className="-mr-1 rounded-xl p-2 text-muted active:bg-surface-2" aria-label="Minimize workout">
          <ChevronDown className="size-6" />
        </button>
      </header>

      <div data-tour="tracker-strip" className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-1">
        {w.exercises.map((e, i) => {
          const ee = exercises.get(e.exerciseId);
          const total = e.sets.length || 1;
          const ratio = e.sets.filter((s) => s.done).length / total;
          const complete = e.sets.length > 0 && ratio === 1;
          return (
            <button key={e.id} type="button" onClick={() => go(i)} className="relative w-[68px] shrink-0" aria-label={ee?.name ?? "Exercise"}>
              {e.supersetId && w.exercises[i + 1]?.supersetId === e.supersetId && (
                <span className="absolute -right-2.5 top-[38px] z-10 flex h-2 w-3 items-center justify-center rounded-full bg-accent" aria-hidden />
              )}
              <span
                className={cn(
                  "relative block h-[84px] overflow-hidden rounded-xl transition",
                  i === index ? "opacity-100" : "opacity-55",
                  e.supersetId && "ring-2 ring-accent/70",
                )}
              >
                {ee ? (
                  <ExerciseThumb exercise={ee} className="size-full" />
                ) : (
                  <span className="flex size-full items-center justify-center bg-surface-2 text-faint">
                    <Dumbbell className="size-5" />
                  </span>
                )}
                {complete && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/35"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-white text-black">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  </motion.span>
                )}
              </span>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-surface-3">
                <motion.span
                  className={cn("block h-full rounded-full", i === index ? "bg-ink" : "bg-accent")}
                  animate={{ width: `${i === index ? 100 : ratio * 100}%` }}
                />
              </span>
            </button>
          );
        })}
        <button type="button" onClick={() => setSheet("add")} className="w-[68px] shrink-0" aria-label="Add exercise">
          <span className="flex h-[84px] items-center justify-center rounded-xl bg-surface-2 text-muted active:bg-surface-3">
            <Plus className="size-7" />
          </span>
          <span className="mt-2 block h-1 rounded-full bg-surface-3" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {!x ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <span className="flex size-16 items-center justify-center rounded-3xl bg-surface-2 text-muted">
              <Dumbbell className="size-7" />
            </span>
            <p className="mt-5 font-display text-2xl font-semibold">Empty workout</p>
            <p className="mt-1.5 text-sm text-muted">Add the exercises you&apos;re doing today. You can add more as you go.</p>
            <Button onClick={() => setSheet("add")} className="mt-6 h-12 rounded-full px-6 text-[15px]">
              <Plus className="size-5" /> Add exercises
            </Button>
          </div>
        ) : (
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div
              key={x.id}
              custom={dir}
              initial={{ x: `${dir * 100}%`, opacity: 0.4 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: `${dir * -100}%`, opacity: 0.4 }}
              transition={{ type: "spring", bounce: 0, duration: 0.38 }}
              drag={editing ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              dragDirectionLock
              onDragEnd={(_, info) => {
                if (info.offset.x < -70 || info.velocity.x < -500) go(index + 1);
                else if (info.offset.x > 70 || info.velocity.x > 500) go(index - 1);
              }}
              className="absolute inset-0 overflow-y-auto overscroll-contain px-4 pb-32 pt-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight">{ex?.name ?? "Exercise"}</h2>
                  <p className="mt-1 text-[15px] text-muted">
                    {nextUp === -1 ? (working.length ? "All sets done" : "No sets yet") : `Set ${nextUp + 1} of ${working.length}`}
                  </p>
                </div>
                <BestChip exerciseId={x.exerciseId} logs={logs} units={units} />
              </div>

              <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
                <button type="button" className={chip} onClick={() => setSheet("reorder")} disabled={w.exercises.length < 2}>
                  <GripVertical className="size-4" /> Reorder
                </button>
                <button
                  type="button"
                  className={cn(chip, x.supersetId && "bg-accent/15 text-accent")}
                  onClick={() => (x.supersetId ? unlinkSuperset(x.id) : linkNext())}
                  disabled={!x.supersetId && index === w.exercises.length - 1}
                >
                  <Link2 className="size-4" /> {x.supersetId ? "Unlink" : "Superset next"}
                </button>
                <button type="button" className={chip} onClick={() => setSheet("info")}>
                  <Info className="size-4" /> Info
                </button>
                <button
                  type="button"
                  className={chip}
                  onClick={() => {
                    const first = x.sets.find((s) => s.kind !== "warmup");
                    if (x.sets.some((s) => s.kind === "warmup") || !first) return toast({ tone: "advice", title: "Warm-up sets are already in" });
                    updateExercise(x.id, (e) => ({ ...e, sets: [...warmupSets(first), ...e.sets] }));
                  }}
                >
                  <Flame className="size-4" /> Warm up
                </button>
                <button type="button" className={chip} onClick={() => setSheet("swap")}>
                  <Repeat2 className="size-4" /> Swap
                </button>
                <button
                  type="button"
                  className={chip}
                  onClick={() => {
                    setNoteDraft(x.note);
                    setSheet("note");
                  }}
                >
                  <NotebookPen className="size-4" /> Note
                </button>
                <button type="button" className={chip} onClick={() => setSheet("rest")}>
                  <Timer className="size-4" /> {fmtClock(x.restSec * 1000)}
                </button>
                <button
                  type="button"
                  className={cn(chip, "text-danger")}
                  onClick={() => {
                    if (x.sets.some((s) => s.done) && !window.confirm(`Remove ${ex?.name ?? "this exercise"} and its logged sets?`)) return;
                    updateWorkout((y) => ({ ...y, exercises: y.exercises.filter((e) => e.id !== x.id), current: Math.max(0, index - 1) }));
                  }}
                  aria-label="Remove exercise"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {x.note && (
                <button
                  type="button"
                  onClick={() => (setNoteDraft(x.note), setSheet("note"))}
                  className="mt-4 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm text-ink/85"
                >
                  <NotebookPen className="mr-1.5 inline size-3.5 text-muted" />
                  {x.note}
                </button>
              )}

              <div className="mt-6">
                <ExercisePane
                  w={w}
                  x={x}
                  ex={ex}
                  logs={logs}
                  units={units}
                  editing={editing}
                  onEdit={edit}
                  onToggle={toggle}
                  onSetMenu={setSetMenu}
                  onDelete={(s) => updateExercise(x.id, (e) => ({ ...e, sets: e.sets.filter((z) => z.id !== s.id) }))}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {!editing && x && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-10 md:pb-4">
            {index < w.exercises.length - 1 ? (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="pointer-events-auto flex h-14 w-full items-center justify-between rounded-full bg-surface-2 pl-6 pr-2 text-left transition active:scale-[0.98]"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] text-muted">Up next</span>
                  <span className="block truncate text-[15px] font-medium">
                    {exercises.get(w.exercises[index + 1].exerciseId)?.name ?? "Exercise"}
                  </span>
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-ink text-bg">
                  <ChevronDown className="size-5 -rotate-90" />
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSheet("finish")}
                className="pointer-events-auto flex h-14 w-full items-center justify-center gap-2 rounded-full bg-accent text-[16px] font-semibold text-accent-ink shadow-[0_12px_30px_-12px_rgb(198_244_50/0.7)] transition active:scale-[0.98]"
              >
                <Flag className="size-5" /> Finish workout
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing && current && (
          <Keypad
            field={editing.field}
            buffer={editing.fresh ? String(valueOf(current, editing.field) ?? "") : editing.buffer}
            rir={current.rir}
            unit={units === "metric" ? "kg" : "lb"}
            onKey={onKey}
            onStep={step}
            onRir={(v) => patchSet(current.id, { rir: v })}
            onNext={next}
            onDone={() => {
              if (!current.done) toggle(current);
              setEditing(null);
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>

      <ExerciseSheet open={sheet === "add"} mode="add" onClose={() => setSheet(null)} onDone={addExercises} />
      <ExerciseSheet
        open={sheet === "swap"}
        mode="swap"
        onClose={() => setSheet(null)}
        onDone={(ids) => {
          swap(ids[0]);
          setSheet(null);
        }}
      />

      <Sheet open={sheet === "menu"} onClose={() => setSheet(null)} title="Workout options">
        <div className="divide-y divide-line px-2 pb-4">
          {[
            { icon: w.pausedAt ? Play : Pause, label: w.pausedAt ? "Resume workout" : "Pause workout", run: togglePause },
            { icon: ChevronDown, label: "Minimize workout", run: minimize },
            { icon: Pencil, label: "Rename workout", run: () => (setNameDraft(w.name), setSheet("rename")) },
            { icon: Flag, label: "Finish workout", run: () => setSheet("finish") },
            { icon: Trash2, label: "Discard workout", run: () => setSheet("discard"), danger: true },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => {
                setSheet(null);
                o.run();
              }}
              className={cn("flex w-full items-center gap-4 px-4 py-4 text-left text-[17px] active:bg-surface-2", o.danger && "text-danger")}
            >
              <o.icon className="size-6" /> {o.label}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "rest" || (sheet === "rest-auto" && !!w.rest)} onClose={() => setSheet(null)} title="Rest timer">
        <div className="px-5 pb-6">
          {w.rest ? (
            <div className="flex flex-col items-center">
              <div className="relative size-44">
                <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="var(--color-surface-3)" strokeWidth="7" />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={276.5}
                    animate={{ strokeDashoffset: 276.5 * (1 - Math.max(0, w.rest.endsAt - now) / (w.rest.total * 1000)) }}
                    transition={{ duration: 0.3, ease: "linear" }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-display text-4xl font-semibold tabular-nums">
                  {fmtClock(w.rest.endsAt - now)}
                </span>
              </div>
              <div className="mt-5 grid w-full grid-cols-3 gap-2">
                <Button
                  variant="secondary"
                  className="h-12"
                  onClick={() => updateWorkout((y) => (y.rest ? { ...y, rest: { ...y.rest, endsAt: y.rest.endsAt - 15000 } } : y))}
                >
                  -15s
                </Button>
                <Button
                  variant="secondary"
                  className="h-12"
                  onClick={() => updateWorkout((y) => (y.rest ? { ...y, rest: { endsAt: y.rest.endsAt + 15000, total: y.rest.total + 15 } } : y))}
                >
                  +15s
                </Button>
                <Button className="h-12" onClick={() => (updateWorkout((y) => ({ ...y, rest: null })), setSheet(null))}>
                  Skip
                </Button>
              </div>
            </div>
          ) : (
            <p className="pb-2 text-center text-sm text-muted">Tick a set to start resting.</p>
          )}
          {x && (
            <>
              <p className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Rest for {ex?.name ?? "this exercise"}</p>
              <div className="grid grid-cols-4 gap-2">
                {REST_PRESETS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => updateExercise(x.id, (e) => ({ ...e, restSec: sec }))}
                    className={cn(
                      "rounded-xl py-2.5 text-sm font-medium transition",
                      x.restSec === sec ? "bg-ink text-bg" : "bg-surface-2 text-muted",
                    )}
                  >
                    {fmtClock(sec * 1000)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Sheet>

      <Sheet open={sheet === "note"} onClose={() => setSheet(null)} title="Exercise note">
        <div className="px-5 pb-6">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value.slice(0, 1000))}
            autoFocus
            placeholder="Seat height 4, pause at the bottom, felt strong…"
            className="min-h-32 w-full rounded-2xl border border-line bg-surface-2 p-4 text-[15px] outline-none focus:border-accent/60"
          />
          <Button
            className="mt-3 h-12 w-full rounded-full"
            onClick={() => (x && updateExercise(x.id, (e) => ({ ...e, note: noteDraft.trim() })), setSheet(null))}
          >
            Save note
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === "rename"} onClose={() => setSheet(null)} title="Rename workout">
        <div className="px-5 pb-6">
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value.slice(0, 120))}
            autoFocus
            className="h-12 w-full rounded-2xl border border-line bg-surface-2 px-4 text-[15px] outline-none focus:border-accent/60"
          />
          <Button
            className="mt-3 h-12 w-full rounded-full"
            onClick={() => (updateWorkout((y) => ({ ...y, name: nameDraft.trim() || "Workout" })), setSheet(null))}
          >
            Save
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === "info"} onClose={() => setSheet(null)} title={ex?.name ?? "Exercise"} full>
        {ex && (
          <div className="px-5 pb-8">
            <ExerciseImages exercise={ex} className="aspect-[4/3] w-full rounded-2xl" />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {musclesForExercise(ex).primary.map((m) => (
                <span key={m} className="rounded-lg bg-accent/12 px-2 py-1 text-xs font-medium text-accent">
                  {muscleById(m)?.name}
                </span>
              ))}
              {musclesForExercise(ex).secondary.map((m) => (
                <span key={m} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
                  {muscleById(m)?.name}
                </span>
              ))}
            </div>
            <ol className="mt-5 space-y-3">
              {ex.instructions.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink/90">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-[11px] font-bold">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <Link
              href={`/exercises/${ex.id}`}
              onClick={() => {
                setSheet(null);
                minimize();
              }}
              className="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-surface-2 text-sm font-medium"
            >
              <TrendingUp className="size-4 text-accent" /> Progress and friends
            </Link>
          </div>
        )}
      </Sheet>

      <Sheet open={!!setMenu} onClose={() => setSetMenu(null)} title="Set">
        {setMenu && x && (
          <div className="divide-y divide-line px-2 pb-4">
            {[
              {
                label: setMenu.kind === "warmup" ? "Make it a working set" : "Make it a warm-up set",
                run: () => patchSet(setMenu.id, { kind: setMenu.kind === "warmup" ? "working" : "warmup" }),
              },
              { label: "Clear reps in reserve", run: () => patchSet(setMenu.id, { rir: null }) },
              {
                label: "Delete set",
                danger: true,
                run: () => updateExercise(x.id, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setMenu.id) })),
              },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => {
                  o.run();
                  setSetMenu(null);
                }}
                className={cn("w-full px-4 py-4 text-left text-[17px] active:bg-surface-2", o.danger && "text-danger")}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </Sheet>

      <Sheet open={sheet === "finish"} onClose={() => setSheet(null)} title="Finish workout?">
        <div className="px-5 pb-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Time", fmtClock(elapsed)],
              ["Sets", String(done.sets)],
              [
                "Volume",
                `${units === "metric" ? done.volume.toLocaleString() : Math.round(kgToLb(done.volume)).toLocaleString()} ${units === "metric" ? "kg" : "lb"}`,
              ],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-surface-2 px-3 py-3 text-center">
                <p className="text-[11px] text-muted">{k}</p>
                <p className="mt-0.5 font-display text-lg font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
          {done.sets === 0 ? (
            <p className="mt-4 rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
              You haven&apos;t ticked any sets yet. Tick the sets you did, or discard this workout.
            </p>
          ) : (
            skipped > 0 && (
              <p className="mt-4 text-sm text-muted">
                {skipped} unticked set{skipped === 1 ? "" : "s"} won&apos;t be saved.
              </p>
            )
          )}
          <Button className="mt-5 h-12 w-full rounded-full text-[15px]" disabled={done.sets === 0} onClick={finish}>
            <Flag className="size-5" /> Finish and save
          </Button>
          <Button variant="ghost" className="mt-2 h-11 w-full" onClick={() => setSheet(null)}>
            Keep going
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === "discard"} onClose={() => setSheet(null)} title="Discard workout?">
        <div className="px-5 pb-6">
          <p className="text-sm text-muted">Everything you logged in this workout will be deleted. This can&apos;t be undone.</p>
          <Button
            variant="danger"
            className="mt-5 h-12 w-full rounded-full"
            onClick={() => {
              postToWorker({ type: "rest-cancel" });
              clearWorkout();
            }}
          >
            <Trash2 className="size-4" /> Discard workout
          </Button>
          <Button variant="ghost" className="mt-2 h-11 w-full" onClick={() => setSheet(null)}>
            Keep going
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === "reorder"} onClose={() => setSheet(null)} title="Reorder exercises">
        <ReorderList w={w} exercises={exercises} />
      </Sheet>

      <Guide id="tracker" steps={TRACKER_GUIDE} layer="overlay" finalLabel="Start lifting" />
    </motion.div>
  );
}

function ReorderItem({ e, ex }: { e: TrackExercise; ex: Exercise | undefined }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={e}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-2 pr-1"
    >
      {ex ? <ExerciseThumb exercise={ex} className="size-11 shrink-0 rounded-xl" /> : <span className="size-11 rounded-xl bg-surface-3" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{ex?.name ?? "Exercise"}</span>
        <span className="block text-xs text-muted">
          {e.sets.length} sets{e.supersetId ? " · superset" : ""}
        </span>
      </span>
      <span
        onPointerDown={(ev) => controls.start(ev)}
        className="flex size-11 cursor-grab touch-none items-center justify-center rounded-xl text-muted active:bg-surface-3"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-5" />
      </span>
    </Reorder.Item>
  );
}

function ReorderList({ w, exercises }: { w: ActiveWorkout; exercises: Map<string, Exercise> }) {
  return (
    <div className="px-4 pb-6">
      <p className="mb-3 text-xs text-muted">Hold the handle and drag to change the order.</p>
      <Reorder.Group
        axis="y"
        values={w.exercises}
        onReorder={(list: TrackExercise[]) => {
          const currentId = w.exercises[w.current]?.id;
          updateWorkout((y) => ({
            ...y,
            exercises: list,
            current: Math.max(
              0,
              list.findIndex((e) => e.id === currentId),
            ),
          }));
        }}
        className="space-y-2"
      >
        {w.exercises.map((e) => (
          <ReorderItem key={e.id} e={e} ex={exercises.get(e.exerciseId)} />
        ))}
      </Reorder.Group>
    </div>
  );
}

function MiniBar({ w }: { w: ActiveWorkout }) {
  const now = useNow(500);
  const { db } = useExerciseDB();
  const x = w.exercises[Math.min(w.current, w.exercises.length - 1)];
  const name = x ? db?.exercises.find((e) => e.id === x.exerciseId)?.name : null;
  const rest = w.rest ? Math.max(0, w.rest.endsAt - now) : 0;
  return (
    <motion.button
      type="button"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
      onClick={() => updateWorkout((y) => ({ ...y, minimized: false }))}
      className="fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom)_-_12px,4px)_+_62px)] z-[75] flex items-center gap-3 rounded-2xl border border-line-strong bg-surface/95 p-2.5 pr-3 text-left shadow-[0_18px_40px_-14px_rgb(0_0_0/0.9)] backdrop-blur md:inset-x-auto md:bottom-5 md:right-5 md:w-80"
      aria-label="Open workout"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
        <Dumbbell className="size-5" />
        {!w.pausedAt && <span className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-danger ring-2 ring-surface" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{w.name}</span>
        <span className="block truncate text-xs text-muted">
          {fmtClock(elapsedMs(w, now))}
          {name && ` · ${name}`}
        </span>
      </span>
      {w.rest && (
        <span className="flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 font-display text-sm font-semibold tabular-nums text-accent">
          <Timer className="size-3.5" /> {fmtClock(rest)}
        </span>
      )}
      <ChevronUp className="size-5 text-muted" />
    </motion.button>
  );
}

export function TrackerHost() {
  const w = useActiveWorkout();
  const user = useSessionUser();
  const now = useNow(1000, !!w?.rest);
  const [summary, setSummary] = useState<WorkoutLog | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const logs = useLogs() ?? [];
  const mine = w && user && w.userId === user.id ? w : null;
  useRestAlarm(mine, now);

  useEffect(() => {
    onOpenStart(() => setStartOpen(true));
    flushPending();
    return () => onOpenStart(null);
  }, []);

  return (
    <>
      <AnimatePresence>
        {mine && !mine.minimized && <ExpandedTracker key="tracker" w={mine} onFinished={setSummary} />}
        {mine && mine.minimized && <MiniBar key="mini" w={mine} />}
      </AnimatePresence>
      <StartSheet open={startOpen} onClose={() => setStartOpen(false)} />
      <WorkoutSummary log={summary} prs={summary ? personalBests(summary, logs) : []} onClose={() => setSummary(null)} />
    </>
  );
}
