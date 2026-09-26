"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, MousePointerClick } from "lucide-react";
import { groupById, muscleById } from "@/data/muscles";
import { musclesForExercise, useExerciseDB } from "@/lib/explorer";
import { BodyFigure } from "@/components/explorer/BodyFigure";
import { ExplorerTabs } from "@/components/explorer/ExplorerTabs";
import { ExercisePanel, GroupPanel, MusclePanel, OverviewPanel } from "@/components/explorer/Panels";
import { useExplorerNav } from "@/components/explorer/useExplorerNav";
import { Segmented } from "@/components/ui";

function Explorer() {
  const nav = useExplorerNav();
  const { db, error } = useExerciseDB();
  const panelRef = useRef<HTMLDivElement>(null);
  const exercise = useMemo(() => (nav.exercise ? db?.exercises.find((e) => e.id === nav.exercise) ?? null : null), [db, nav.exercise]);
  const highlight = useMemo(() => (exercise ? musclesForExercise(exercise) : null), [exercise]);

  // Exercise view shows the whole body lit up; otherwise zoom to the selected group.
  const focusGroup = exercise ? null : nav.group && groupById(nav.group) ? nav.group : null;
  const selectedMuscle = exercise ? null : nav.muscle && muscleById(nav.muscle) ? nav.muscle : null;
  const panelKey = exercise ? `e:${exercise.id}` : selectedMuscle ? `m:${selectedMuscle}` : focusGroup ? `g:${focusGroup}` : "home";

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [panelKey]);

  return (
    <div className="flex h-full flex-col">
      <ExplorerTabs
        right={
          <Segmented
            size="sm"
            value={nav.sex}
            onChange={nav.setSex}
            options={[
              { id: "male", label: "Male" },
              { id: "female", label: "Female" },
            ]}
          />
        }
      />
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(360px,55vh)_1fr] lg:grid-cols-2 lg:grid-rows-1">
        {/* Figure */}
        <div className="board-grid relative min-h-0 border-b border-line lg:border-b-0 lg:border-r">
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3 sm:p-4">
            {focusGroup || exercise ? (
              <button
                type="button"
                onClick={exercise ? nav.closeExercise : nav.home}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 text-xs font-medium backdrop-blur hover:border-line-strong"
              >
                <Maximize2 className="size-3.5" /> {exercise ? "Back" : "Full body"}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 rounded-lg bg-surface/80 px-2.5 py-1.5 text-xs text-muted backdrop-blur">
                <MousePointerClick className="size-3.5 text-accent" /> Click a muscle group
              </span>
            )}
            {focusGroup && <span className="rounded-lg bg-surface/80 px-2.5 py-1.5 text-xs font-medium backdrop-blur">{groupById(focusGroup)?.name}</span>}
            {exercise && (
              <span className="flex items-center gap-3 rounded-lg bg-surface/80 px-2.5 py-1.5 text-[11px] text-muted backdrop-blur">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-accent" /> Primary
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-accent/40" /> Secondary
                </span>
              </span>
            )}
          </div>
          <div className="absolute inset-0 px-2 pb-3 pt-14 sm:px-6">
            <BodyFigure
              sex={nav.sex}
              focusGroup={focusGroup}
              selectedMuscle={selectedMuscle}
              highlight={highlight}
              onGroup={nav.openGroup}
              onMuscle={nav.openMuscle}
            />
          </div>
        </div>

        {/* Info panel */}
        <div ref={panelRef} className="scrollbar-thin min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8 sm:py-8">
            {error && <p className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={panelKey}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {exercise ? (
                  <ExercisePanel nav={nav} exercise={exercise} />
                ) : selectedMuscle ? (
                  <MusclePanel nav={nav} muscleId={selectedMuscle} />
                ) : focusGroup ? (
                  <GroupPanel nav={nav} groupId={focusGroup} />
                ) : (
                  <OverviewPanel nav={nav} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense>
      <Explorer />
    </Suspense>
  );
}
