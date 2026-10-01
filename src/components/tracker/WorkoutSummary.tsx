"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Clock, Dumbbell, Flame, Share2, Trophy } from "lucide-react";
import { ShareStudio } from "../share/ShareStudio";
import { workoutShare } from "../share/content";
import { kgToLb, round1 } from "@/lib/body";
import { useExerciseMap } from "@/lib/analysis";
import { bestValue, metricFor, metricFormat } from "@/lib/metrics";
import { useProfile, useSessionUser } from "@/lib/storage";
import { fmtClock, workoutStats } from "@/lib/tracker";
import type { LoggedExercise, WorkoutLog } from "@/lib/types";
import { Button } from "../ui";

const BITS = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37) % 100,
  d: (i % 7) * 0.07,
  c: ["#c6f432", "#5aaeff", "#ff9a3c", "#a78bfa", "#3dd6d0"][i % 5],
  r: (i * 47) % 360,
}));

export function WorkoutSummary({ log, prs, onClose }: { log: WorkoutLog | null; prs: LoggedExercise[]; onClose: () => void }) {
  const exercises = useExerciseMap();
  const units = useProfile()?.body.units ?? "metric";
  const user = useSessionUser();
  const [sharing, setSharing] = useState(false);
  const content = useMemo(
    () => (log ? workoutShare(log, exercises, units, prs, user?.username) : null),
    [log, exercises, units, prs, user?.username],
  );
  if (typeof document === "undefined") return null;
  const st = log ? workoutStats(log) : null;

  return createPortal(
    <>
      <ShareStudio open={sharing && !!log} onClose={() => setSharing(false)} content={content} />
      <AnimatePresence>
        {log && st && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[96] flex flex-col overflow-y-auto bg-bg pt-[env(safe-area-inset-top)] md:items-center md:justify-center md:bg-black/70 md:p-6"
          >
            <div className="relative w-full md:max-w-lg md:overflow-hidden md:rounded-[28px] md:border md:border-line-strong md:bg-surface">
              <div className="relative h-44 overflow-hidden bg-gradient-to-br from-accent/25 via-surface-2 to-info/15">
                {BITS.map((b, i) => (
                  <motion.span
                    key={i}
                    className="absolute top-0 h-3 w-1.5 rounded-sm"
                    style={{ left: `${b.x}%`, background: b.c, rotate: b.r }}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 190, opacity: [0, 1, 1, 0], rotate: b.r + 220 }}
                    transition={{ duration: 2, delay: b.d, repeat: 1, ease: "easeIn" }}
                  />
                ))}
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.15 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                >
                  <span className="flex size-16 items-center justify-center rounded-3xl bg-accent text-accent-ink shadow-[0_14px_40px_-12px_rgb(198_244_50/0.8)]">
                    <Trophy className="size-8" />
                  </span>
                  <p className="mt-3 font-display text-2xl font-semibold">Workout done</p>
                </motion.div>
              </div>

              <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5">
                <p className="text-center text-sm text-muted">{log.name}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { icon: Clock, k: "Time", v: fmtClock((log.durationSec ?? 0) * 1000) },
                    { icon: Dumbbell, k: "Sets", v: String(st.sets) },
                    {
                      icon: Flame,
                      k: "Volume",
                      v: `${(units === "metric" ? st.volume : Math.round(kgToLb(st.volume))).toLocaleString()} ${units === "metric" ? "kg" : "lb"}`,
                    },
                  ].map((s, i) => (
                    <motion.div
                      key={s.k}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.07 }}
                      className="rounded-2xl bg-surface-2 px-3 py-3 text-center"
                    >
                      <s.icon className="mx-auto size-4 text-accent" />
                      <p className="mt-1 font-display text-lg font-semibold tabular-nums">{s.v}</p>
                      <p className="text-[11px] text-muted">{s.k}</p>
                    </motion.div>
                  ))}
                </div>

                {prs.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-warn/30 bg-warn/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-warn">
                      <Trophy className="size-4" /> {prs.length} new personal best{prs.length === 1 ? "" : "s"}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {prs.map((x) => {
                        const m = metricFor(x.sets);
                        return (
                          <li key={x.exerciseId} className="flex justify-between gap-3">
                            <span className="truncate">{exercises.get(x.exerciseId)?.name ?? "Exercise"}</span>
                            <span className="shrink-0 tabular-nums text-muted">{metricFormat(m, units)(bestValue(x.sets, m) ?? 0)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
                  {log.exercises.map((x) => {
                    const done = x.sets.filter((s) => s.done && s.kind !== "warmup");
                    const top = [...done].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
                    return (
                      <li key={x.exerciseId} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                        <span className="min-w-0 truncate">
                          {done.length} × {exercises.get(x.exerciseId)?.name ?? "Exercise"}
                        </span>
                        {top && (
                          <span className="shrink-0 tabular-nums text-muted">
                            {top.weight
                              ? `${units === "metric" ? round1(top.weight) : Math.round(kgToLb(top.weight))} ${units === "metric" ? "kg" : "lb"} × `
                              : ""}
                            {top.holdSec != null && top.reps == null ? `${top.holdSec}s` : top.reps}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Button variant="secondary" className="h-12 rounded-full text-[15px]" onClick={() => setSharing(true)}>
                    <Share2 className="size-4" /> Share
                  </Button>
                  <Button className="h-12 rounded-full text-[15px]" onClick={onClose}>
                    Done
                  </Button>
                </div>
                <Link href="/history" onClick={onClose} className="mt-2 flex h-11 items-center justify-center text-sm text-muted hover:text-ink">
                  See workout history
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
}
