"use client";

import Link from "next/link";
import { BedDouble, Clock, Gauge } from "lucide-react";
import { EDITOR_KIND, sessionActivity } from "@/data/activities";
import { formatWeight } from "@/lib/body";
import type { Exercise } from "@/lib/explorer";
import { segmentLabel } from "@/lib/load";
import { blockType } from "@/lib/options";
import type { ProgramDay, Units } from "@/lib/types";
import { fmtRest, setSummary, SUPERSET_LETTERS } from "@/lib/workout";
import { ExerciseThumb } from "../explorer/ExerciseBits";
import { cn } from "../ui";

export function DayContent({ day, exercises, units, compact }: { day: ProgramDay; exercises: Map<string, Exercise>; units: Units; compact?: boolean }) {
  const fmt = (kg: number) => formatWeight(kg, units);
  if (!day.blocks.length || day.blocks.every((b) => b.type === "recovery")) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-6 text-sm text-muted">
        <BedDouble className="size-5 text-faint" />
        Rest day. Recover, eat well and sleep.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {day.blocks.map((b) => {
        const bt = blockType(b.type);
        const kind = EDITOR_KIND[b.type];
        let supersets = 0;
        return (
          <div key={b.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${bt.color} 18%, transparent)`, color: bt.color }}>
                {bt.icon && <bt.icon className="size-3.5" />}
              </span>
              <span className="text-sm font-semibold">{bt.label}</span>
            </div>

            {b.type === "recovery" && <p className="px-4 py-3 text-sm text-muted">Active recovery. Easy movement, mobility, walks.</p>}

            {kind === "session" && b.session && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="font-medium">{sessionActivity(b.session.activity).label}</span>
                {b.session.durationMin != null && (
                  <span className="flex items-center gap-1 text-muted">
                    <Clock className="size-3.5" /> {b.session.durationMin} min
                  </span>
                )}
                <span className="flex items-center gap-1 text-muted">
                  <Gauge className="size-3.5" /> RPE {b.session.rpe}
                </span>
                {b.session.notes && <p className="w-full text-xs text-faint">{b.session.notes}</p>}
              </div>
            )}

            {kind === "cardio" && (
              <ul className="divide-y divide-line">
                {(b.cardio ?? []).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">Z{s.zone}</span>
                    <span className="min-w-0 flex-1 truncate">{segmentLabel(s)}</span>
                  </li>
                ))}
                {!b.cardio?.length && <li className="px-4 py-3 text-sm text-faint">Nothing planned yet</li>}
              </ul>
            )}

            {(b.entries?.length ?? 0) > 0 && (
              <ul className="divide-y divide-line">
                {b.entries!.map((e) => {
                  const letter = e.exercises.length > 1 ? SUPERSET_LETTERS[supersets++] : null;
                  return (
                    <li key={e.id} className={cn("px-4 py-2.5", letter && "border-l-2 border-l-accent/60")}>
                      {e.exercises.map((x, i) => {
                        const ex = exercises.get(x.exerciseId);
                        return (
                          <div key={x.id} className={cn("flex items-center gap-3", i > 0 && "mt-2")}>
                            {!compact && ex && <ExerciseThumb exercise={ex} className="size-10 shrink-0 rounded-lg" />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {letter && <span className="mr-1.5 font-mono text-[11px] text-accent">{`${letter}${i + 1}`}</span>}
                                {ex ? (
                                  <Link href={`/exercises/${ex.id}`} className="hover:underline">
                                    {ex.name}
                                  </Link>
                                ) : exercises.size ? (
                                  "Custom exercise"
                                ) : (
                                  <span className="inline-block h-3 w-36 animate-pulse rounded bg-surface-3 align-middle" />
                                )}
                              </p>
                              <p className="truncate text-xs text-muted">{setSummary(x.sets, fmt, ex?.discipline === "plyometrics" ? " contacts" : "")}</p>
                            </div>
                          </div>
                        );
                      })}
                      {!compact && e.restSec != null && <p className="mt-1.5 text-[11px] text-faint">Rest {fmtRest(e.restSec)}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
            {kind && kind !== "cardio" && kind !== "session" && !b.entries?.length && b.type !== "recovery" && (
              <p className="px-4 py-3 text-sm text-faint">Nothing planned yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
