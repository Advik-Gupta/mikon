"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Dumbbell } from "lucide-react";
import { DISCIPLINES } from "@/data/activities";
import { imageUrl, titleCase, useExerciseDB, type Exercise } from "@/lib/explorer";
import { cn } from "../ui";

const LEVEL_COLOR: Record<string, string> = { beginner: "#5ed1a0", intermediate: "#ffb547", expert: "#ff6b8a" };

export function LevelDot({ level }: { level: string }) {
  return <span className="size-1.5 shrink-0 rounded-full" style={{ background: LEVEL_COLOR[level] ?? "#8a919c" }} title={titleCase(level)} />;
}

/** Two-frame photo sequence that alternates like a GIF to show the movement. */
export function ExerciseImages({ exercise, className, animate = true }: { exercise: Exercise; className?: string; animate?: boolean }) {
  const { db } = useExerciseDB();
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const count = exercise.images.length;

  useEffect(() => {
    if (!animate || count < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % count), 1100);
    return () => clearInterval(t);
  }, [animate, count]);

  if (!db || !count) {
    const d = DISCIPLINES.find((x) => x.id === exercise.discipline);
    const Icon = d?.icon ?? Dumbbell;
    return (
      <div className={cn("flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-surface-2 to-surface-3 text-muted", className)}>
        <Icon className="size-1/3 max-h-10 max-w-10 opacity-70" />
        {animate && exercise.family && <span className="text-[11px]">{exercise.family} progression</span>}
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-surface-3" />}
      {exercise.images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={imageUrl(db, src)}
          alt={`${exercise.name}, ${i === 0 ? "start" : "end"} position`}
          loading="lazy"
          onLoad={() => i === 0 && setLoaded(true)}
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-500", i === frame ? "opacity-100" : "opacity-0")}
        />
      ))}
    </div>
  );
}

export function ExerciseThumb({ exercise, className }: { exercise: Exercise; className?: string }) {
  return <ExerciseImages exercise={exercise} animate={false} className={className} />;
}

export function ExerciseRow({ exercise, onOpen, badge }: { exercise: Exercise; onOpen: () => void; badge?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2 pr-3 text-left transition hover:border-line-strong hover:bg-surface-2"
    >
      <ExerciseThumb exercise={exercise} className="size-14 shrink-0 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{exercise.name}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
          <LevelDot level={exercise.level} />
          {titleCase(exercise.level)} · {titleCase(exercise.equipment)}
          {badge && <span className="rounded bg-accent/12 px-1.5 py-px font-medium text-accent">{badge}</span>}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  );
}

export function ExerciseList({
  exercises,
  onOpen,
  step = 12,
  empty = "No exercises found.",
  badge,
}: {
  exercises: Exercise[];
  onOpen: (id: string) => void;
  step?: number;
  empty?: string;
  badge?: (e: Exercise) => string | undefined;
}) {
  const [shown, setShown] = useState(step);
  if (!exercises.length) return <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-faint">{empty}</p>;
  return (
    <div className="space-y-2">
      {exercises.slice(0, shown).map((e) => (
        <ExerciseRow key={e.id} exercise={e} onOpen={() => onOpen(e.id)} badge={badge?.(e)} />
      ))}
      {shown < exercises.length && (
        <button
          type="button"
          onClick={() => setShown((s) => s + step * 2)}
          className="w-full rounded-xl border border-line py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-ink"
        >
          Show more · {exercises.length - shown} left
        </button>
      )}
    </div>
  );
}
